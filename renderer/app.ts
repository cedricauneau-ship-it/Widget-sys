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

function shortenLabel(text: string, max = 16): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const ctx = {
  cpu: getCanvasContext("cpu-gauge"),
  ram: getCanvasContext("ram-gauge"),
  netIn: getCanvasContext("net-graph-in"),
  netOut: getCanvasContext("net-graph-out"),
};

const rxHistory: number[] = [];
const txHistory: number[] = [];

type DynGridState = { contexts: CanvasRenderingContext2D[]; lastCount: number };

function ensureDynamicGauges(containerId: string, count: number, state: DynGridState): void {
  if (count === state.lastCount) return;
  state.lastCount = count;

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";
  state.contexts = [];

  for (let i = 0; i < count; i++) {
    const canvas = document.createElement("canvas");
    canvas.width = GAUGE_WIDTH;
    canvas.height = GAUGE_HEIGHT;
    container.appendChild(canvas);
    const context = canvas.getContext("2d");
    if (context) state.contexts.push(context);
  }
}

const diskGrid: DynGridState = { contexts: [], lastCount: -1 };
const gpuGrid: DynGridState = { contexts: [], lastCount: -1 };

const pauseBtn = document.getElementById("pause-btn") as HTMLButtonElement | null;
const minBtn = document.getElementById("min-btn") as HTMLButtonElement | null;
const maxBtn = document.getElementById("max-btn") as HTMLButtonElement | null;
const winCloseBtn = document.getElementById("winclose-btn") as HTMLButtonElement | null;
const led = document.getElementById("led");
const statusText = document.getElementById("status-text");
const netRxEl = document.getElementById("net-rx");
const netTxEl = document.getElementById("net-tx");

function resizeNetCanvases(): void {
  [ctx.netIn, ctx.netOut].forEach((c) => {
    const displayWidth = c.canvas.clientWidth;
    if (displayWidth > 0 && c.canvas.width !== displayWidth) {
      c.canvas.width = displayWidth;
    }
  });
  drawNetTrace(ctx.netIn, ctx.netIn.canvas.width, ctx.netIn.canvas.height, rxHistory, "#5b8dd9");
  drawNetTrace(ctx.netOut, ctx.netOut.canvas.width, ctx.netOut.canvas.height, txHistory, "#b98cd9");
}

const resizeObserver = new ResizeObserver(() => resizeNetCanvases());
const frameEl = document.querySelector(".frame");
if (frameEl) resizeObserver.observe(frameEl);

function render(snapshot: Snapshot): void {
  drawGauge(ctx.cpu, GAUGE_WIDTH, GAUGE_HEIGHT, { value: snapshot.cpuPct, label: "CPU" });

  const ramPct = (snapshot.memUsedGb / snapshot.memTotalGb) * 100;
  drawGauge(ctx.ram, GAUGE_WIDTH, GAUGE_HEIGHT, { value: ramPct, label: "RAM" });

  ensureDynamicGauges("disk-grid", snapshot.disks.length, diskGrid);
  snapshot.disks.forEach((disk, i) => {
    const target = diskGrid.contexts[i];
    if (!target) return;
    const displayLabel =
      disk.label === disk.mount ? disk.mount : `${disk.label} (${disk.mount})`;
    drawGauge(target, GAUGE_WIDTH, GAUGE_HEIGHT, {
      value: disk.usedPct,
      label: shortenLabel(displayLabel),
    });
  });

  ensureDynamicGauges("gpu-grid", snapshot.gpus.length, gpuGrid);
  snapshot.gpus.forEach((gpu, i) => {
    const target = gpuGrid.contexts[i];
    if (!target) return;
    drawGauge(target, GAUGE_WIDTH, GAUGE_HEIGHT, {
      value: gpu.utilizationPct ?? 0,
      label: gpu.model ? shortenLabel(gpu.model) : `GPU ${i + 1}`,
      isUnavailable: gpu.utilizationPct == null,
    });
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
  if (pauseBtn) {
    pauseBtn.textContent = paused ? "▶" : "⏸";
    pauseBtn.classList.toggle("paused", paused);
    pauseBtn.setAttribute("aria-label", paused ? "Reprendre" : "Mettre en pause");
  }
  if (led) led.classList.toggle("paused", paused);
  if (statusText) statusText.textContent = paused ? "PAUSED" : "LIVE";
}

function setMaximizeIcon(maximized: boolean): void {
  if (maxBtn) maxBtn.textContent = maximized ? "❐" : "▢";
}

pauseBtn?.addEventListener("click", () => {
  void window.sysWidget.togglePause();
});

minBtn?.addEventListener("click", () => {
  window.sysWidget.minimizeWindow();
});

maxBtn?.addEventListener("click", () => {
  window.sysWidget.toggleMaximizeWindow();
});

winCloseBtn?.addEventListener("click", () => {
  window.sysWidget.closeApp();
});

window.sysWidget.onPauseState(setPauseLabel);
window.sysWidget.onMaximizeState(setMaximizeIcon);
window.sysWidget.onMetrics(render);