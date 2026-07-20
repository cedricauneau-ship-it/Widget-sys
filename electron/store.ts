import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

type WindowPosition = { x: number; y: number };

const storePath = path.join(app.getPath("userData"), "window-position.json");

export function loadPosition(): WindowPosition | null {
  try {
    const raw = fs.readFileSync(storePath, "utf-8");
    return JSON.parse(raw) as WindowPosition;
  } catch {
    return null; // premier lancement : le fichier n'existe pas encore
  }
}

export function savePosition(position: WindowPosition): void {
  fs.writeFileSync(storePath, JSON.stringify(position));
}