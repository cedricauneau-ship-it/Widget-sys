import si from "systeminformation";

type GpuStat = {
  model: string;
  utilizationPct: number | null; // null = non exposé par le pilote
  memUsedMb: number | null;
};

type Snapshot = {
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
  diskUsedPct: number;
  netRxMbps: number;
  netTxMbps: number;
  gpus: GpuStat[];
};

const toGb = (bytes: number): number => bytes / 1024 ** 3;

async function takeSnapshot(): Promise<Snapshot> {
  const [cpu, mem, fs, net, gfx] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.graphics(),
  ]);

  const mainDisk = fs[0]; // hypothèse : premier volume = disque système
  const iface = net[0]; // networkStats() sans argument = interface par défaut

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

function printSnapshot(s: Snapshot): void {
  console.clear();
  console.log(
    `CPU ${s.cpuPct.toFixed(0)} %  |  RAM ${s.memUsedGb.toFixed(1)}/${s.memTotalGb.toFixed(1)} Go  |  Disque ${s.diskUsedPct.toFixed(0)} %`,
  );
  console.log(
    `Réseau  ↓ ${s.netRxMbps.toFixed(2)} Mb/s   ↑ ${s.netTxMbps.toFixed(2)} Mb/s`,
  );
  console.table(s.gpus);
}

const POLL_MS = 2000;

setInterval(() => {
  takeSnapshot()
    .then(printSnapshot)
    .catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Échec de la sonde : ${message}`);
    });
}, POLL_MS);