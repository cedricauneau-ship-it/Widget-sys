import { app, BrowserWindow, Menu, Tray, nativeImage, utilityProcess, ipcMain } from "electron";
import path from "node:path";
import { loadBounds, saveBounds } from "./store.js";
import { loadSettings, saveSettings, type Settings } from "./settings-store.js";
import { listNetOptions, pickDefaultNetIface } from "./hardware-options.js";
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

function resizeToContent(win: BrowserWindow): void {
  win.webContents
    .executeJavaScript("document.querySelector('.frame').getBoundingClientRect().height")
    .then((frameHeight: number) => {
      win.setContentSize(440, Math.ceil(frameHeight));
    })
    .catch((err: unknown) => {
      console.error("Mesure du contenu échouée :", err);
    });
}

async function resolveEffectiveConfig(saved: Settings): Promise<Settings> {
  const nets = await listNetOptions();
  const netIface =
    saved.netIface && nets.some((n) => n.iface === saved.netIface)
      ? saved.netIface
      : await pickDefaultNetIface();
  return { netIface };
}

async function buildNetMenuItems(
  current: Settings,
  onSelect: (next: Settings) => void,
): Promise<Electron.MenuItemConstructorOptions[]> {
  const nets = await listNetOptions();
  const netItems: Electron.MenuItemConstructorOptions[] = nets.map((n) => ({
    label: n.label,
    type: "radio",
    checked: n.iface === current.netIface,
    click: () => onSelect({ ...current, netIface: n.iface }),
  }));
  return [{ label: "Interface réseau", submenu: netItems }];
}

function createWindow(): void {
  const saved = loadBounds();
  const hasSavedSize = Boolean(saved?.width && saved?.height);

  const win = new BrowserWindow({
    width: saved?.width ?? 440,
    height: saved?.height ?? 300,
    minWidth: 360,
    minHeight: 280,
    x: saved?.x,
    y: saved?.y,
    frame: false,
    transparent: false,
    backgroundColor: "#14201b",
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const debouncedSaveBounds = debounce(() => {
    saveBounds(win.getBounds());
  }, 300);

  win.on("moved", debouncedSaveBounds);
  win.on("resize", debouncedSaveBounds);

  win.on("maximize", () => win.webContents.send("window:maximize-state", true));
  win.on("unmaximize", () => win.webContents.send("window:maximize-state", false));

  win.loadFile(path.join(__dirname, "../public/index.html"));

  const probe = utilityProcess.fork(path.join(__dirname, "probe-worker.js"));

  let hasResizedAfterFirstData = false;
  probe.on("message", (snapshot: Snapshot) => {
    win.webContents.send("metrics:update", snapshot);
    if (!hasSavedSize && !hasResizedAfterFirstData) {
      hasResizedAfterFirstData = true;
      setTimeout(() => resizeToContent(win), 50);
    }
  });

  win.on("closed", () => {
    probe.kill();
  });

  ipcMain.on("window:minimize", () => win.minimize());
  ipcMain.on("window:toggle-maximize", () => {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  void setupControls(win, probe);
}

async function setupControls(win: BrowserWindow, probe: Electron.UtilityProcess): Promise<void> {
  let isPaused = false;
  let currentConfig = await resolveEffectiveConfig(loadSettings());
  saveSettings(currentConfig);
  probe.postMessage({ type: "config", ...currentConfig });

  const icon = nativeImage.createFromDataURL(`data:image/png;base64,${TRAY_ICON_BASE64}`);
  const tray = new Tray(icon);
  tray.setToolTip("SysWidget");

  function setPaused(paused: boolean): void {
    isPaused = paused;
    probe.postMessage({ type: isPaused ? "pause" : "resume" });
    void rebuildTrayMenu();
    win.webContents.send("app:pause-state", isPaused);
  }

  function setConfig(next: Settings): void {
    currentConfig = next;
    saveSettings(currentConfig);
    probe.postMessage({ type: "config", ...currentConfig });
    void rebuildTrayMenu();
  }

  async function rebuildTrayMenu(): Promise<void> {
    const netItems = await buildNetMenuItems(currentConfig, setConfig);
    const menu = Menu.buildFromTemplate([
      {
        label: isPaused ? "Reprendre" : "Mettre en pause",
        click: () => setPaused(!isPaused),
      },
      { type: "separator" },
      ...netItems,
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

  await rebuildTrayMenu();

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