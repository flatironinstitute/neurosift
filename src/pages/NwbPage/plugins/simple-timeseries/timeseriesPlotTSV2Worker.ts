import { PlotOpts as Opts } from "./types";

let canvas: OffscreenCanvas | undefined = undefined;
let opts: Opts | undefined = undefined;

const draw = () => {
  if (!canvas || !opts) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Clear canvas
  ctx.clearRect(0, 0, opts.canvasWidth, opts.canvasHeight);

  // Calculate plot dimensions
  const plotWidth = opts.canvasWidth - opts.margins.left - opts.margins.right;
  const plotHeight = opts.canvasHeight - opts.margins.top - opts.margins.bottom;

  // Calculate standard deviation for channel separation
  const avgStdDev =
    opts.data.length === 0
      ? 0
      : opts.data.reduce((sum, channel) => {
          const mean =
            channel.reduce((sum, val) => sum + val, 0) / channel.length;
          const squaredDiffs = channel.map((val) => Math.pow(val - mean, 2));
          const variance =
            squaredDiffs.reduce((sum, val) => sum + val, 0) / channel.length;
          return sum + Math.sqrt(variance);
        }, 0) / opts.data.length;

  // Calculate time scaling
  const timeToPixel = (t: number) =>
    opts!.margins.left +
    ((t - opts!.visibleStartTimeSec) /
      (opts!.visibleEndTimeSec - opts!.visibleStartTimeSec)) *
      plotWidth;

  // Calculate value range
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < opts.data.length; i++) {
    const offset =
      (opts.data.length - 1 - i) * opts.channelSeparation * avgStdDev;
    const channelMin = Math.min(...opts.data[i]) + offset;
    const channelMax = Math.max(...opts.data[i]) + offset;
    yMin = Math.min(yMin, channelMin);
    yMax = Math.max(yMax, channelMax);
  }

  // Add padding to value range
  const yPadding = (yMax - yMin) * 0.05;
  yMin -= yPadding;
  yMax += yPadding;

  // Calculate value scaling
  const valueToPixel = (v: number) =>
    opts!.margins.top + plotHeight - ((v - yMin) / (yMax - yMin)) * plotHeight;

  // Draw traces
  ctx.lineWidth = 1;
  const colors = [
    "#1f77b4", // blue
    "#ff7f0e", // orange
    "#2ca02c", // green
    "#d62728", // red
    "#9467bd", // purple
    "#8c564b", // brown
    "#e377c2", // pink
    "#7f7f7f", // gray
  ];

  // Draw each channel
  for (let i = 0; i < opts.data.length; i++) {
    const channel = opts.data[i];
    const offset =
      (opts.data.length - 1 - i) * opts.channelSeparation * avgStdDev;

    ctx.strokeStyle = colors[i % colors.length];
    ctx.beginPath();

    // Plot points
    for (let j = 0; j < channel.length; j++) {
      const x = timeToPixel(opts.timestamps[j]);
      const y = valueToPixel(channel[j] + offset);
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }
};

onmessage = (e: MessageEvent) => {
  if (e.data.canvas) {
    canvas = e.data.canvas as OffscreenCanvas;
  }
  if (e.data.opts) {
    opts = e.data.opts;
    draw();
  }
};
