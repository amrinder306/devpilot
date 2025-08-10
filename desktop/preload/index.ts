import { contextBridge, ipcRenderer } from "electron";

const arg = process.argv.find(a => a.startsWith("--devpilot-base-url="));
const baseUrl = arg ? arg.split("=")[1] : "";

contextBridge.exposeInMainWorld("DevPilot", {
  getBaseUrl: () => ipcRenderer.invoke("devpilot:getBaseUrl"),
  pickRepo: async (): Promise<string | null> => {
    return ipcRenderer.invoke("devpilot:pickRepo");
  },
});
