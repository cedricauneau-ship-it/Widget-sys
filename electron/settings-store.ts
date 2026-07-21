import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export type Settings = {
  netIface?: string;
};

const settingsPath = path.join(app.getPath("userData"), "settings.json");

export function loadSettings(): Settings {
  try {
    const raw = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(raw) as Settings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: Settings): void {
  fs.writeFileSync(settingsPath, JSON.stringify(settings));
}