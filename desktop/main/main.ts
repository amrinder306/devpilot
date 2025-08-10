import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import getPort, { portNumbers } from "get-port";
import { execa } from "execa";
import http from "node:http";
import fs from "node:fs";
import { dialog } from "electron";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let win: BrowserWindow | null = null;
let engineProc: any | null = null;
let baseUrl = "http://127.0.0.1:5179";

function venvPython(cwd: string) {
  const win = process.platform === "win32";
  const p = win
    ? path.join(cwd, ".venv", "Scripts", "python.exe")
    : path.join(cwd, ".venv", "bin", "python");
  return fs.existsSync(p) ? p : null;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth(url: string, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(!!res.statusCode && res.statusCode >= 200 && res.statusCode < 300);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy(new Error("timeout"));
        resolve(false);
      });
    });
    if (ok) return true;
    await wait(300);
  }
  return false;
}

async function startEngine() {
  const port = await getPort({ port: portNumbers(5123, 5200) });
  baseUrl = `http://127.0.0.1:${port}`;

  const isDev = !app.isPackaged;
  const devCwd = path.resolve(__dirname, "../../../engine"); // <- engine sibling to desktop
  const prodCwd = path.resolve(process.resourcesPath, "engine");
  const cwd = isDev ? devCwd : prodCwd;

  const env = { ...process.env, DEVPILOT_PORT: String(port) };

  // Prefer packaged native binary in production (not mandatory)
  const binWin = path.join(cwd, "engine.exe");
  const binNix = path.join(cwd, "engine");
  const hasNative = fs.existsSync(process.platform === "win32" ? binWin : binNix);

  let command: string;
  let args: string[];

  if (!isDev && hasNative) {
    command = process.platform === "win32" ? binWin : binNix;
    args = [];
  } else {
    // Dev (or prod fallback): run uvicorn through venv if present
    const py = venvPython(cwd) || (process.platform === "win32" ? "python.exe" : "python3");
    command = py;
    args = [
      "-m",
      "uvicorn",
      "app:app",
      "--app-dir",
      cwd,
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      ...(isDev ? ["--reload", "--reload-dir", cwd] : [])
    ];
  }

  try {
    engineProc = execa(command, args, {
      cwd,
      env,
      stdio: "ignore" // set to 'inherit' to see uvicorn logs in terminal
    });
    engineProc.catch(() => {}); // avoid unhandled rejection on kill
  } catch (e) {
    console.error("Failed to spawn engine:", e);
  }

  const healthy = await waitForHealth(`${baseUrl}/health`, 20000);
  if (!healthy) {
    console.warn("Engine health timed out — continuing. Base URL:", baseUrl);
  }
}

async function createWindow() {
  try { await startEngine(); } catch (e) { console.warn("startEngine error:", e); }
  const isDev = !app.isPackaged;
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.resolve(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: isDev,                 // true in dev, false in prod
      allowRunningInsecureContent: !isDev 
    }
  });

  if (isDev) {
    await win.loadURL("http://localhost:5173");
  } else {
    await win.loadFile(path.resolve(__dirname, "../../renderer/index.html"));
  }
}

process.on("unhandledRejection", (reason) => {
  console.warn("Unhandled rejection:", reason);
});

ipcMain.handle("devpilot:pickRepo", async () => {
  const res = await dialog.showOpenDialog({
    title: "Select a repository folder",
    properties: ["openDirectory"],
  });
  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});
app.on("ready", createWindow);

app.on("before-quit", async () => {
  if (engineProc) {
    try {
      engineProc.kill("SIGTERM", { forceKillAfterTimeout: 2000 });
    } catch {}
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Optional: renderer can ask for engine base URL
ipcMain.handle("devpilot:getBaseUrl", () => baseUrl);
ipcMain.on("devpilot:getBaseUrlSync", (event) => {
  event.returnValue = baseUrl;
});