import si from "systeminformation";

export type NetOption = { iface: string; label: string };

export async function listNetOptions(): Promise<NetOption[]> {
  const interfaces = await si.networkInterfaces();
  const list = Array.isArray(interfaces) ? interfaces : [interfaces];
  return list
    .filter((i) => !i.internal)
    .map((i) => ({ iface: i.iface, label: `${i.iface} (${i.ifaceName ?? i.type})` }));
}

export async function pickDefaultNetIface(): Promise<string> {
  try {
    const defaultIface = await si.networkInterfaceDefault();
    if (defaultIface) return defaultIface;
  } catch {
    // pas de passerelle par défaut détectable — on retombe sur le premier plan B
  }
  const interfaces = await si.networkInterfaces();
  const list = Array.isArray(interfaces) ? interfaces : [interfaces];
  return list.find((i) => !i.internal)?.iface ?? "";
}