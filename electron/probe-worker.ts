import { takeSnapshot, type MetricsConfig } from "./metrics.js";

const POLL_MS = 2000;
let isPaused = false;
let config: MetricsConfig = {};

type WorkerCommand =
  | { type: "pause" }
  | { type: "resume" }
  | { type: "config"; netIface?: string };

process.parentPort.on("message", (e) => {
  const command = e.data as WorkerCommand;
  if (command.type === "pause") isPaused = true;
  if (command.type === "resume") isPaused = false;
  if (command.type === "config") {
    config = { netIface: command.netIface };
  }
});

async function loop(): Promise<void> {
  if (isPaused) return;
  try {
    const snapshot = await takeSnapshot(config);
    process.parentPort.postMessage(snapshot);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Échec de la sonde (worker) : ${message}`);
  }
}

setInterval(loop, POLL_MS);
loop();