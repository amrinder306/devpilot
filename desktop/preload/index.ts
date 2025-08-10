import { contextBridge, ipcRenderer } from "electron";

const arg = process.argv.find(a => a.startsWith("--devpilot-base-url="));

contextBridge.exposeInMainWorld("DevPilot", {
  getBaseUrl: () => ipcRenderer.sendSync("devpilot:getBaseUrlSync"),
  pickRepo: async (): Promise<string | null> => {
    return ipcRenderer.invoke("devpilot:pickRepo");
  },
  
});