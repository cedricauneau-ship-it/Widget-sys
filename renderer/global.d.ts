import type { Snapshot } from "./types";

export {};

declare global {
  interface Window {
    sysWidget: {
      platform: string;
      onMetrics: (callback: (snapshot: Snapshot) => void) => void;
    };
  }
}