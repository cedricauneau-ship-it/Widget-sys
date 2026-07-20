import { contextBridge, ipcRenderer } from "electron";
import type { Snapshot } from "./metrics.js";

contextBridge.exposeInMainWorld("sysWidget", {
  platform: process.platform,
  onMetrics: (callback: (snapshot: Snapshot) => void) => {
    ipcRenderer.on("metrics:update", (_event, snapshot: Snapshot) => {
      callback(snapshot);
    });
  },
});