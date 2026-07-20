import type { Snapshot } from "./types";
import { drawGauge } from "./gauge.js";
import { drawNetTrace } from "./netgraph.js";

const GAUGE_WIDTH = 120;
const GAUGE_HEIGHT = 142;
const NET_HISTORY_LENGTH = 30;

function getCanvasContext(id: string): CanvasRenderingContext2D {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) throw new Error(`Canvas #${id} introuvable dans le DOM`);
  const context = canvas.getContext("2d");
  if (!context) throw new Error(`Contexte 2D indisponible pour #${id}`);
  return context;
}

function shortenGpuName(model: string): string {
  return model.length > 14 ? `${model.slice(0, 14)}…` : model;
}

function findGpu(gpus: Snapshot["gpus"], keyword: string) {
  return gpus.find((g) => g.model.toLowerCase().includes(keyword));
}

const ctx = {
  cpu: getCanvasContext("cpu-gauge"),
  ram: getCanvasContext("ram-gauge"),
  disk: getCanvasContext("disk-gauge"),
  gpu0: getCanvasContext("gpu0-gauge"),
  gpu1: getCanvasContext("gpu1-gauge"),
  netIn: getCanvasContext("net-graph-in"),
  netOut: getCanvasContext("net-graph-out"),
};

const rxHistory: number[] = [];
const txHistory: number[] = [];

const pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement | null;
const closeBtn = document.getElementById("close-btn") as HTMLButtonElement | null;
const led = document.getElementById("led");
const statusText = document.getElementById("status-text");
const netRxEl = document.getElementById("net-rx");
const netTxEl = document.getElementById("net-tx");

function render(snapshot: Snapshot): void {
  drawGauge(ctx.cpu, GAUGE_WIDTH, GAUGE_HEIGHT, { value: snapshot.cpuPct, label: "CPU" });

  const ramPct = (snapshot.memUsedGb / snapshot.memTotalGb) * 100;
  drawGauge(ctx.ram, GAUGE_WIDTH, GAUGE_HEIGHT, { value: ramPct, label: "RAM" });

  drawGauge(ctx.disk, GAUGE_WIDTH, GAUGE_HEIGHT, { value: snapshot.diskUsedPct, label: "Disque" });

  const nvidia = findGpu(snapshot.gpus, "nvidia");
  const amd = findGpu(snapshot.gpus, "amd");

  drawGauge(ctx.gpu0, GAUGE_WIDTH, GAUGE_HEIGHT, {
    value: nvidia?.utilizationPct ?? 0,
    label: nvidia ? shortenGpuName(nvidia.model) : "GPU0",
    isUnavailable: nvidia?.utilizationPct == null,
  });
  drawGauge(ctx.gpu1, GAUGE_WIDTH, GAUGE_HEIGHT, {
    value: amd?.utilizationPct ?? 0,
    label: amd ? shortenGpuName(amd.model) : "GPU1",
    isUnavailable: amd?.utilizationPct == null,
  });

  rxHistory.push(snapshot.netRxMbps);
  txHistory.push(snapshot.netTxMbps);
  if (rxHistory.length > NET_HISTORY_LENGTH) rxHistory.shift();
  if (txHistory.length > NET_HISTORY_LENGTH) txHistory.shift();

  drawNetTrace(ctx.netIn, ctx.netIn.canvas.width, ctx.netIn.canvas.height, rxHistory, "#5b8dd9");
  drawNetTrace(ctx.netOut, ctx.netOut.canvas.width, ctx.netOut.canvas.height, txHistory, "#b98cd9");

  if (netRxEl) netRxEl.textContent = snapshot.netRxMbps.toFixed(1);
  if (netTxEl) netTxEl.textContent = snapshot.netTxMbps.toFixed(1);
}

function setPauseLabel(paused: boolean): void {
  if (pauseBtn) pauseBtn.textContent = paused ? "RESUME" : "PAUSE";
  if (led) led.classList.toggle("paused", paused);
  if (statusText) statusText.textContent = paused ? "PAUSED" : "LIVE";
}

pauseBtn?.addEventListener("click", () => {
  void window.sysWidget.togglePause();
});

closeBtn?.addEventListener("click", () => {
  window.sysWidget.closeApp();
});

window.sysWidget.onPauseState(setPauseLabel);
window.sysWidget.onMetrics(render);