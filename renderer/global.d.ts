import type { Snapshot } from "./types";

export {};

declare global {
  interface Window {
    sysWidget: {
      platform: string;
      onMetrics: (callback: (snapshot: Snapshot) => void) => void;
      togglePause: () => Promise<boolean>;
      closeApp: () => void;
      onPauseState: (callback: (paused: boolean) => void) => void;
      minimizeWindow: () => void;
      toggleMaximizeWindow: () => void;
      onMaximizeState: (callback: (maximized: boolean) => void) => void;
    };
  }
}