export type GaugeOptions = {
  value: number;
  label: string;
  isUnavailable?: boolean;
};

const COLOR_TRACK = "#26362e";
const COLOR_TICK_MINOR = "#324840";
const COLOR_TICK_MAJOR = "#48645a";
const COLOR_TEXT = "#e8f5ea";
const COLOR_TEXT_DIM = "#8ba396";
const COLOR_OK = "#3ecf8e";
const COLOR_WARN = "#f5a524";
const COLOR_CRIT = "#e5484d";
const FONT_MONO =
  "ui-monospace, 'Cascadia Code', 'SF Mono', Consolas, 'Roboto Mono', monospace";

const START_ANGLE = 0.75 * Math.PI;
const END_ANGLE = 2.25 * Math.PI;
const SWEEP = END_ANGLE - START_ANGLE;
const MAJOR_TICKS = [0, 25, 50, 75, 100];

function valueColor(value: number): string {
  if (value > 85) return COLOR_CRIT;
  if (value > 60) return COLOR_WARN;
  return COLOR_OK;
}

function drawTicks(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  for (let pct = 0; pct <= 100; pct += 5) {
    const angle = START_ANGLE + (pct / 100) * SWEEP;
    const isMajor = MAJOR_TICKS.includes(pct);
    const outer = radius + 6;
    const inner = outer - (isMajor ? 6 : 3);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.strokeStyle = isMajor ? COLOR_TICK_MAJOR : COLOR_TICK_MINOR;
    ctx.lineWidth = isMajor ? 1.5 : 1;
    ctx.stroke();
  }
}

export function drawGauge(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opts: GaugeOptions,
): void {
  const cx = width / 2;
  const cy = width / 2;
  const radius = width / 2 - 14;
  const ratio = opts.isUnavailable ? 0 : Math.min(opts.value, 100) / 100;
  const valueAngle = START_ANGLE + ratio * SWEEP;

  ctx.clearRect(0, 0, width, height);
  drawTicks(ctx, cx, cy, radius);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, START_ANGLE, END_ANGLE);
  ctx.strokeStyle = COLOR_TRACK;
  ctx.lineWidth = 8;
  ctx.lineCap = "butt";
  ctx.stroke();

  if (!opts.isUnavailable) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, START_ANGLE, valueAngle);
    ctx.strokeStyle = valueColor(opts.value);
    ctx.lineWidth = 8;
    ctx.lineCap = "butt";
    ctx.stroke();
  }

  ctx.fillStyle = opts.isUnavailable ? COLOR_TEXT_DIM : COLOR_TEXT;
  ctx.font = `600 19px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(opts.isUnavailable ? "N/A" : `${Math.round(opts.value)}%`, cx, cy - 3);

  ctx.fillStyle = COLOR_TEXT_DIM;
  ctx.font = `11px ${FONT_MONO}`;
  ctx.fillText(opts.label.toUpperCase(), cx, height - 14);
}