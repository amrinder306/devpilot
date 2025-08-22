export const devpilot = {
  hasToken: () => window.devpilot.hasDeviceToken() as Promise<boolean>,
  getConfig: () => window.devpilot.getConfig(),
  saveConfig: (cfg: any) => window.devpilot.saveConfig(cfg),
  register: (fingerprint: string, version: string) => window.devpilot.register(fingerprint, version),
  pickFolder: () => window.devpilot.pickFolder(),
  buildSnapshot: (root: string) => window.devpilot.buildSnapshot(root),
  llmRun: (payload: any) => window.devpilot.llmRun(payload),
}
