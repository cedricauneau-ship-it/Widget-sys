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