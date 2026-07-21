import si from "systeminformation";

export type GpuStat = {
  model: string;
  utilizationPct: number | null;
  memUsedMb: number | null;
};

export type DiskStat = {
  mount: string;
  label: string;
  usedPct: number;
};

export type Snapshot = {
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
  disks: DiskStat[];
  netRxMbps: number;
  netTxMbps: number;
  gpus: GpuStat[];
};

export type MetricsConfig = {
  netIface?: string;
};

const toGb = (bytes: number): number => bytes / 1024 ** 3;
const MIN_DISK_SIZE_BYTES = 1024 ** 3; // 1 Go — écarte les partitions système/récupération

let diskLabelCache: Map<string, string> | null = null;

async function getDiskLabels(): Promise<Map<string, string>> {
  if (diskLabelCache) return diskLabelCache;
  const blocks = await si.blockDevices();
  const map = new Map<string, string>();
  for (const b of blocks) {
    if (b.mount) map.set(b.mount, b.label || b.name || b.mount);
  }
  diskLabelCache = map;
  return map;
}

export async function takeSnapshot(config: MetricsConfig = {}): Promise<Snapshot> {
  const [cpu, mem, fsList, netList, gfx, labels] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    config.netIface ? si.networkStats(config.netIface) : si.networkStats(),
    si.graphics(),
    getDiskLabels(),
  ]);

  const disks: DiskStat[] = fsList
    .filter((d) => d.size >= MIN_DISK_SIZE_BYTES)
    .map((d) => ({
      mount: d.mount,
      label: labels.get(d.mount) ?? d.mount,
      usedPct: d.use,
    }));

  const iface = netList[0];

  return {
    cpuPct: cpu.currentLoad,
    memUsedGb: toGb(mem.active),
    memTotalGb: toGb(mem.total),
    disks,
    netRxMbps: iface ? (iface.rx_sec * 8) / 1e6 : 0,
    netTxMbps: iface ? (iface.tx_sec * 8) / 1e6 : 0,
    gpus: gfx.controllers.map((c) => ({
      model: c.model,
      utilizationPct: c.utilizationGpu ?? null,
      memUsedMb: c.memoryUsed ?? null,
    })),
  };
}