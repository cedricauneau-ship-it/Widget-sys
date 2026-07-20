import type { Snapshot } from "./types";
import { drawGauge } from "./gauge.js";

const CANVAS_SIZE = 120;

function getCanvasContext(id: string): CanvasRenderingContext2D {
  const canvas = document.getElementById(id) as HTMLCanvasElement | null;
  if (!canvas) throw new Error(`Canvas #${id} introuvable dans le DOM`);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(`Contexte 2D indisponible pour #${id}`);
  return ctx;
}

function shortenGpuName(model: string): string {
  return model.length > 14 ? `${model.slice(0, 14)}…` : model;
}

const ctx = {
  cpu: getCanvasContext("cpu-gauge"),
  ram: getCanvasContext("ram-gauge"),
  disk: getCanvasContext("disk-gauge"),
  gpu0: getCanvasContext("gpu0-gauge"),
  gpu1: getCanvasContext("gpu1-gauge"),
};

function render(snapshot: Snapshot): void {
  drawGauge(ctx.cpu, CANVAS_SIZE, { value: snapshot.cpuPct, label: "CPU" });

  const ramPct = (snapshot.memUsedGb / snapshot.memTotalGb) * 100;
  drawGauge(ctx.ram, CANVAS_SIZE, { value: ramPct, label: "RAM" });

  drawGauge(ctx.disk, CANVAS_SIZE, { value: snapshot.diskUsedPct, label: "Disque" });

  function findGpu(gpus: Snapshot["gpus"], keyword: string) {
  return gpus.find((g) => g.model.toLowerCase().includes(keyword));
}

  const nvidia = findGpu(snapshot.gpus, "nvidia");
  const amd = findGpu(snapshot.gpus, "amd");

  drawGauge(ctx.gpu0, CANVAS_SIZE, {
    value: nvidia?.utilizationPct ?? 0,
    label: nvidia ? shortenGpuName(nvidia.model) : "GPU0",
    isUnavailable: nvidia?.utilizationPct == null,
  });
  drawGauge(ctx.gpu1, CANVAS_SIZE, {
    value: amd?.utilizationPct ?? 0,
    label: amd ? shortenGpuName(amd.model) : "GPU1",
    isUnavailable: amd?.utilizationPct == null,
  });

  const netEl = document.getElementById("net");
  if (netEl) {
    netEl.textContent = `↓ ${snapshot.netRxMbps.toFixed(1)} Mb/s   ↑ ${snapshot.netTxMbps.toFixed(1)} Mb/s`;
  }
}

window.sysWidget.onMetrics(render);