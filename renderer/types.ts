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