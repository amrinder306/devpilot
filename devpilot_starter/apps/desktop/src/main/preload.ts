import { contextBridge, ipcRenderer } from 'electron';

const api = {
  // basics
  ping: () => ipcRenderer.invoke('ping'),
  hasDeviceToken: () => ipcRenderer.invoke('auth:hasToken'),
  register: (fingerprint: string, version: string) =>
    ipcRenderer.invoke('auth:register', { fingerprint, version }),
  entitlements: () => ipcRenderer.invoke('auth:entitlements'),

  // config
  getConfig: () => ipcRenderer.invoke('config:get'),
  saveConfig: (cfg: any) => ipcRenderer.invoke('config:save', cfg),

  // repo scan
  buildSnapshot: (root: string) => ipcRenderer.invoke('scanner:build', { root }),
  pickFolder: () => ipcRenderer.invoke('dialog:openFolder'),

  // secrets (keychain)
  setEndpointSecret: (id: string, api_key: string) =>
    ipcRenderer.invoke('secrets:setEndpoint', { id, api_key }),
  getEndpointSecret: (id: string) =>
    ipcRenderer.invoke('secrets:getEndpoint', { id }),

  // metrics
  metricsLog: (ev: any) => ipcRenderer.invoke('metrics:log', ev),
  tokensByProject: (fromISO: string, toISO: string) =>
    ipcRenderer.invoke('metrics:tokensByProject', { fromISO, toISO }),

  // patching
  applyFile: (repoRoot: string, relPath: string, content: string) =>
    ipcRenderer.invoke('patch:applyFile', { repoRoot, relPath, content }),
  applyWithBackup: (repoRoot: string, relPath: string, content: string) =>
    ipcRenderer.invoke('patch:applyWithBackup', { repoRoot, relPath, content }),
  rollbackFile: (repoRoot: string, relPath: string) =>
    ipcRenderer.invoke('patch:rollback', { repoRoot, relPath }),

  // LLM
  llmRun: (payload: any) => ipcRenderer.invoke('llm:run', payload),

  // validation
  validationStart: (repoRoot: string) =>
    ipcRenderer.invoke('validation:start', { repoRoot }),
  validationStop: (jobId: string) =>
    ipcRenderer.invoke('validation:stop', { jobId }),
  onValidationEvent: (jobId: string, ev: string, cb: (data: any) => void) => {
    const channel = `validation:event:${jobId}:${ev}`;
    const handler = (_e: unknown, data: any) => cb(data);
    ipcRenderer.on(channel, handler);
    // return unsubscribe
    return () => ipcRenderer.removeListener(channel, handler);
  },
  resetDeviceToken: () => ipcRenderer.invoke('auth:resetToken'),
  readFile: (repoRoot: string, relPath: string) =>
    ipcRenderer.invoke('fs:readFile', { repoRoot, relPath }),

};

declare global {
  interface Window {
    devpilot: typeof api;
  }
}

contextBridge.exposeInMainWorld('devpilot', api);
