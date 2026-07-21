import { contextBridge, ipcRenderer } from "electron";
import type { Snapshot } from "./metrics.js";

contextBridge.exposeInMainWorld("sysWidget", {
  platform: process.platform,
  onMetrics: (callback: (snapshot: Snapshot) => void) => {
    ipcRenderer.on("metrics:update", (_event, snapshot: Snapshot) => {
      callback(snapshot);
    });
  },
  togglePause: (): Promise<boolean> => ipcRenderer.invoke("app:toggle-pause"),
  closeApp: (): void => {
    ipcRenderer.send("app:close");
  },
  onPauseState: (callback: (paused: boolean) => void) => {
    ipcRenderer.on("app:pause-state", (_event, paused: boolean) => {
      callback(paused);
    });
  },
  minimizeWindow: (): void => {
    ipcRenderer.send("window:minimize");
  },
  toggleMaximizeWindow: (): void => {
    ipcRenderer.send("window:toggle-maximize");
  },
  onMaximizeState: (callback: (maximized: boolean) => void) => {
    ipcRenderer.on("window:maximize-state", (_event, maximized: boolean) => {
      callback(maximized);
    });
  },
});