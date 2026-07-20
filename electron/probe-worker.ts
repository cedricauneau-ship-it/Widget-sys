import { takeSnapshot } from "./metrics.js";

const POLL_MS = 2000;

async function loop(): Promise<void> {
  try {
    const snapshot = await takeSnapshot();
    process.parentPort.postMessage(snapshot);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Échec de la sonde (worker) : ${message}`);
  }
}

setInterval(loop, POLL_MS);
loop(); // premier appel immédiat, sans attendre le premier tick