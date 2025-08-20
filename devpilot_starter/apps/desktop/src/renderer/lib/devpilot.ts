export const devpilot = {
  async hasToken(): Promise<boolean> {
    try { return await window.devpilot.hasDeviceToken() } catch { return false }
  },
  async getConfig(): Promise<any> {
    try { return await window.devpilot.getConfig() } catch { return {} }
  },
  async saveConfig(cfg: any): Promise<any> {
    return window.devpilot.saveConfig(cfg)
  },
  async register(fingerprint: string, version: string): Promise<any> {
    return window.devpilot.register(fingerprint, version)
  },
  async pickFolder(): Promise<string | null> {
    return window.devpilot.pickFolder()
  },
  async buildSnapshot(root: string): Promise<any> {
    return window.devpilot.buildSnapshot(root)
  },
  async llmRun(payload: any): Promise<any> {
    return window.devpilot.llmRun(payload)
  }
}
