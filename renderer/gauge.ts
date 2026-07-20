export type GaugeOptions = {
  value: number;
  label: string;
  isUnavailable?: boolean;
};

export function drawGauge(
  ctx: CanvasRenderingContext2D,
  size: number,
  opts: GaugeOptions,
): void {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;
  const startAngle = 0.75 * Math.PI; // 135°
  const endAngle = 2.25 * Math.PI; // 495° -> sweep de 270°, trou en bas
  const ratio = opts.isUnavailable ? 0 : Math.min(opts.value, 100) / 100;
  const valueAngle = startAngle + ratio * (endAngle - startAngle);

  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.strokeStyle = "#2a2a35";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.stroke();

  if (!opts.isUnavailable) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, valueAngle);
    ctx.strokeStyle =
      opts.value > 85 ? "#e5484d" : opts.value > 60 ? "#f5a524" : "#3ecf8e";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.stroke();
  }

  ctx.fillStyle = "#e4e4e7";
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.isUnavailable ? "N/A" : `${Math.round(opts.value)}%`, cx, cy - 4);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(opts.label, cx, cy + size / 2 - 14);
}