import { app, BrowserWindow, Menu, Tray, nativeImage, utilityProcess, ipcMain } from "electron";
import path from "node:path";
import { loadPosition, savePosition } from "./store.js";
import { TRAY_ICON_BASE64 } from "./tray-icon.js";
import type { Snapshot } from "./metrics.js";

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delayMs: number,
): (...args: Args) => void {
  let timer: NodeJS.Timeout | undefined;
  return (...args: Args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}

function createWindow(): void {
  const saved = loadPosition();

  const win = new BrowserWindow({
    width: 420,
    height: 360,
    x: saved?.x,
    y: saved?.y,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const debouncedSave = debounce((x: number, y: number) => {
    savePosition({ x, y });
  }, 300);

  win.on("moved", () => {
    const [x, y] = win.getPosition();
    debouncedSave(x, y);
  });

  win.loadFile(path.join(__dirname, "../public/index.html"));

  // win.webContents.openDevTools({ mode: "detach" });

  const probe = utilityProcess.fork(path.join(__dirname, "probe-worker.js"));

  probe.on("message", (snapshot: Snapshot) => {
    win.webContents.send("metrics:update", snapshot);
  });

  win.on("closed", () => {
    probe.kill();
  });

  setupControls(win, probe);
}

function setupControls(win: BrowserWindow, probe: Electron.UtilityProcess): void {
  let isPaused = false;

  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`);
  const tray = new Tray(icon);
  tray.setToolTip("SysWidget");

  function setPaused(paused: boolean): void {
    isPaused = paused;
    probe.postMessage({ type: isPaused ? "pause" : "resume" });
    rebuildTrayMenu();
    win.webContents.send("app:pause-state", isPaused);
  }

  function rebuildTrayMenu(): void {
    const menu = Menu.buildFromTemplate([
      {
        label: isPaused ? "Reprendre" : "Mettre en pause",
        click: () => setPaused(!isPaused),
      },
      { type: "separator" },
      {
        label: "Quitter",
        click: () => {
          probe.kill();
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(menu);
  }

  rebuildTrayMenu();

  ipcMain.handle("app:toggle-pause", () => {
    setPaused(!isPaused);
    return isPaused;
  });

  ipcMain.on("app:close", () => {
    probe.kill();
    app.quit();
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});