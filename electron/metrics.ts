import si from "systeminformation";

export type GpuStat = {
  model: string;
  utilizationPct: number | null;
  memUsedMb: number | null;
};

export type Snapshot = {
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
  diskUsedPct: number;
  netRxMbps: number;
  netTxMbps: number;
  gpus: GpuStat[];
};

const toGb = (bytes: number): number => bytes / 1024 ** 3;

export async function takeSnapshot(): Promise<Snapshot> {
  const [cpu, mem, fs, net, gfx] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.graphics(),
  ]);

  const mainDisk = fs[0];
  const iface = net[0];

  return {
    cpuPct: cpu.currentLoad,
    memUsedGb: toGb(mem.active),
    memTotalGb: toGb(mem.total),
    diskUsedPct: mainDisk?.use ?? 0,
    netRxMbps: iface ? (iface.rx_sec * 8) / 1e6 : 0,
    netTxMbps: iface ? (iface.tx_sec * 8) / 1e6 : 0,
    gpus: gfx.controllers.map((c) => ({
      model: c.model,
      utilizationPct: c.utilizationGpu ?? null,
      memUsedMb: c.memoryUsed ?? null,
    })),
  };
}