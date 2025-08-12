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

// ESM shims for __filename / __dirname (since main is ESM)
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)

let win: BrowserWindow | null = null
const isDev = process.env.ELECTRON_DEV === '1'

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
  const abs = path.join(repoRoot, relPath)
  fs.mkdirSync(path.dirname(abs), { recursive: true })
  fs.writeFileSync(abs, content, 'utf-8')
  return { ok: true }
})
