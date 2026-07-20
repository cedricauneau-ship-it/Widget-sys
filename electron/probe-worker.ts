import { takeSnapshot } from "./metrics.js";

const POLL_MS = 2000;
let isPaused = false;

process.parentPort.on("message", (e) => {
  const command = e.data as { type: "pause" | "resume" };
  if (command.type === "pause") isPaused = true;
  if (command.type === "resume") isPaused = false;
});

async function loop(): Promise<void> {
  if (isPaused) return;
  try {
    const snapshot = await takeSnapshot();
    process.parentPort.postMessage(snapshot);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Échec de la sonde (worker) : ${message}`);
  }
}

setInterval(loop, POLL_MS);
loop();