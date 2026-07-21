import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

export type WindowBounds = { x: number; y: number; width: number; height: number };

const storePath = path.join(app.getPath("userData"), "window-bounds.json");

export function loadBounds(): Partial<WindowBounds> | null {
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw) as Partial<WindowBounds>;
  } catch {
    return null;
  }
}

export function saveBounds(bounds: WindowBounds): void {
  fs.writeFileSync(storePath, JSON.stringify(bounds));
}