const COLOR_BASELINE = "#2c3f36";

export function drawNetTrace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  values: number[],
  color: string,
): void {
  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  ctx.moveTo(0, height - 1);
  ctx.lineTo(width, height - 1);
  ctx.strokeStyle = COLOR_BASELINE;
  ctx.lineWidth = 1;
  ctx.stroke();

  if (values.length < 2) return;

  const maxVal = Math.max(0.5, ...values);
  const stepX = width / (values.length - 1);
  const scale = (height - 6) / maxVal;

  ctx.beginPath();
  values.forEach((v, i) => {
    const x = i * stepX;
    const y = height - 2 - v * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = "round";
  ctx.stroke();
}