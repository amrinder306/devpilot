import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'node:path'
import url, { fileURLToPath } from 'node:url'
import os from 'node:os'
import fs from 'node:fs'

import { saveToken, getToken, saveEndpointSecret, getEndpointSecret } from './secureStore.js'
import { loadConfig, saveConfig } from './config.js'
import { registerClient, entitlements } from './api.js'
import { buildSnapshot } from './scanner.js'
import { logEvent, tokensByProject } from './metrics.js'

import { deleteToken } from './secureStore.js'
import axios from 'axios'
import { redactSlices } from './redaction.js'
import { startValidation, stopValidation } from './validation.js'
import { applyFile, rollbackFile } from './patcher.js'


// ESM shims for __filename / __dirname (since main is ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

let win: BrowserWindow | null = null
const isDev = process.env.ELECTRON_DEV === '1'
function ensureUnderRoot(repoRoot: string, relPath: string) {
  const absRoot = path.resolve(repoRoot);
  const abs = path.resolve(absRoot, relPath);
  if (!abs.startsWith(absRoot)) throw new Error('Path escapes repo root');
  return abs;
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    await win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    const indexHtml = url.pathToFileURL(
      path.join(__dirname, '..', 'renderer', 'index.html')
    ).toString()
    await win.loadURL(indexHtml)
  }

  win.on('closed', () => { win = null })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
ipcMain.handle('auth:hasToken', async () => {
  const t = await getToken('device_token');
  return !!t;
});
ipcMain.handle('ping', async () => ({ ok: true, ts: Date.now() }))

ipcMain.handle('auth:register', async (_e, { fingerprint, version }) => {
  const data = await registerClient(fingerprint, version)
  await saveToken('device_token', data.device_token)
  return data
})
ipcMain.handle('auth:entitlements', async () => entitlements())
ipcMain.handle('config:get', async () => loadConfig())
ipcMain.handle('config:save', async (_e, cfg) => saveConfig(cfg))

ipcMain.handle('scanner:build', async (_e, { root }) => buildSnapshot(root))

ipcMain.handle('dialog:openFolder', async () => {
  const res = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  if (res.canceled || res.filePaths.length === 0) return null
  return res.filePaths[0]
})

// Secrets for LLM endpoints (keytar)
ipcMain.handle('secrets:setEndpoint', async (_e, { id, api_key }) => {
  await saveEndpointSecret(id, api_key)
  return { ok: true }
})
ipcMain.handle('secrets:getEndpoint', async (_e, { id }) => {
  const v = await getEndpointSecret(id)
  return { api_key: v ?? null }
})

// Metrics
ipcMain.handle('metrics:log', async (_e, ev) => {
  const id = await logEvent(ev)
  return { id }
})
ipcMain.handle('metrics:tokensByProject', async (_e, { fromISO, toISO }) => {
  const rows = await tokensByProject(fromISO, toISO)
  return rows
})

// Patch Apply (safe write)
ipcMain.handle('patch:applyFile', async (_e, { repoRoot, relPath, content }) => {
  ensureUnderRoot(repoRoot, relPath);
  return applyFile(repoRoot, relPath, content);
});
ipcMain.handle('patch:applyWithBackup', async (_e, { repoRoot, relPath, content }) => {
  ensureUnderRoot(repoRoot, relPath);
  return applyFile(repoRoot, relPath, content); // applyFile already writes a .bak.devpilot first if file exists
});
ipcMain.handle('patch:rollback', async (_e, { repoRoot, relPath }) => {
  ensureUnderRoot(repoRoot, relPath);
  return rollbackFile(repoRoot, relPath);
});
ipcMain.handle('auth:resetToken', async () => {
  await deleteToken('device_token')
  return { ok: true }
})
ipcMain.handle('fs:readFile', async (_e, { repoRoot, relPath }) => {
  if (!repoRoot || !relPath) throw new Error('repoRoot and relPath required')
  const absRoot = path.resolve(repoRoot)
  const abs = path.resolve(absRoot, relPath)
  if (!abs.startsWith(absRoot)) throw new Error('Path escapes repo root')
  const content = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : ''
  return { content }
})
ipcMain.handle('llm:run', async (_e, payload) => {
  // payload: { task, slices?, promptMeta? }
  const cfg = loadConfig();
  const base = (cfg.coreApi || 'http://localhost:8000').replace(/\/$/,'');
  const t0 = Date.now();

  const { slices: redSlices } = redactSlices(payload?.slices || []);

  const body = {
    task: payload?.task,
    repo_hints: payload?.promptMeta?.repo_hints ?? null,
    constraints: payload?.promptMeta?.constraints ?? null,
    slices: redSlices
  };

  const res = await axios.post(base + '/infer', body);
  const out = res.data || {};
  const latency_ms = out.latency_ms ?? (Date.now() - t0);

  // Best-effort metrics log
  try {
    await logEvent({
      ts: new Date().toISOString(),
      user_id: 'local',
      repo_id: payload?.promptMeta?.repo_id ?? '',
      project: payload?.promptMeta?.project ?? '',
      job_id: payload?.promptMeta?.job_id ?? '',
      event: 'llm',
      model: out.model_id ?? 'dps',
      tokens_in: out.tokens_in ?? 0,
      tokens_out: out.tokens_out ?? 0,
      latency_ms,
      iterations: 1,
      files_changed: 0,
      loc_delta: 0,
      tests_passed: 0,
      tests_failed: 0,
      coverage: null,
      result: 'ok',
      extra: null
    });
  } catch {}

  return out; // { text, json, model_id, tokens_in, tokens_out, latency_ms }
});
ipcMain.handle('validation:start', async (_e, { repoRoot }) => {
  const jobId = 'val-' + Date.now();
  const webSend = (channel: string, data: any) => win?.webContents.send(channel, data);
  startValidation(jobId, repoRoot, webSend);
  return { jobId };
});

ipcMain.handle('validation:stop', async (_e, { jobId }) => {
  stopValidation(jobId);
  return { ok: true };
});
