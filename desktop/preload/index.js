import { contextBridge } from "electron";
// read from additionalArguments
const arg = process.argv.find(a => a.startsWith("--devpilot-base-url="));
const baseUrl = arg ? arg.split("=")[1] : "http://127.0.0.1:5179";
contextBridge.exposeInMainWorld("devpilot", {
    baseUrl
});
