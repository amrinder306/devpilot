// Ambient types for the API your preload exposes with contextBridge.exposeInMainWorld('devpilot', api)

type ValidationHandler = (data: any) => void;

interface DevpilotAPI {
  // auth / config
  hasDeviceToken(): Promise<boolean>;
  register(fingerprint: string, version: string): Promise<any>;
  getConfig(): Promise<any>;
  saveConfig(cfg: any): Promise<any>;
  entitlements?(): Promise<any>;

  // dialogs / repos / scanning
  pickFolder(): Promise<string | null>;
  buildSnapshot(root: string): Promise<any>;

  // LLM
  llmRun(payload: any): Promise<any>;

  // validation pipeline
  validationStart(repoRoot: string): Promise<{ jobId: string }>;
  validationStop(jobId: string): Promise<{ ok: boolean }>;
  onValidationEvent(jobId: string, ev: "start" | "log" | "end", cb: ValidationHandler): () => void;

  // patch apply + rollback
  applyWithBackup(repoRoot: string, relPath: string, content: string): Promise<{ ok: boolean }>;
  rollbackFile(repoRoot: string, relPath: string): Promise<{ ok: boolean }>;

  // secrets / endpoints (optional)
  setEndpoint?(args: { id: string; api_key: string }): Promise<{ ok: boolean }>;
  getEndpoint?(args: { id: string }): Promise<{ api_key: string | null }>;

  // metrics / reports (optional)
  tokensByProject?(fromISO: string, toISO: string): Promise<Array<{ project: string; tokens: number }>>;

  // dev helpers we added
  resetDeviceToken(): Promise<{ ok: true }>;
  readFile(repoRoot: string, relPath: string): Promise<{ content: string }>;
}

// Make it visible on window
declare global {
  interface Window {
    devpilot: DevpilotAPI;
  }
}

export {};
