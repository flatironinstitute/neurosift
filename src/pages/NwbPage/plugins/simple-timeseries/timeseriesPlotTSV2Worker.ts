import { PlotOpts, PlotData } from "./types";
import {
  channelOffset,
  computeAvgStdDev,
  computeChannelRanges,
  computeYRange,
} from "./timeseriesPlotMath";

let canvas: OffscreenCanvas | undefined = undefined;
let plotOpts: PlotOpts | undefined = undefined;
let plotData: PlotData | undefined = undefined;

// Derived from plotData alone. The channel separation offset depends on
// plotOpts and is applied at draw time, so changing the separation does not
// require recomputing these.
let avgStdDev = 0;
let channelRanges: { mins: number[]; maxs: number[] } = { mins: [], maxs: [] };
const doPlotDataCalculations = () => {
  avgStdDev = computeAvgStdDev(plotData!.data);
  channelRanges = computeChannelRanges(plotData!.data);
};

const draw = async () => {
  if (!canvas || !plotOpts || !plotData) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (plotOpts.zoomInRequired) {
    // Clear canvas
    ctx.clearRect(0, 0, plotOpts.canvasWidth, plotOpts.canvasHeight);
    // Draw zoom warning message
    ctx.fillStyle = "#dc3545"; // Bootstrap danger red
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "Please zoom in to view the data - current view would load too many points",
      plotOpts.canvasWidth / 2,
      plotOpts.canvasHeight / 2,
    );
    return;
  }

  const { yMin, yMax } = computeYRange(
    channelRanges,
    plotOpts.channelSeparation,
    avgStdDev,
  );

  // Post yMin and yMax back to main thread
  postMessage({
    type: "yAxisRange",
    yMin,
    yMax,
  });

  // Calculate plot dimensions
  const plotWidth =
    plotOpts.canvasWidth - plotOpts.margins.left - plotOpts.margins.right;
  const plotHeight =
    plotOpts.canvasHeight - plotOpts.margins.top - plotOpts.margins.bottom;

  await new Promise((resolve) => setTimeout(resolve, 0));

  // Calculate time scaling
  const timeToPixel = (t: number) =>
    plotOpts!.margins.left +
    ((t - plotOpts!.visibleStartTimeSec) /
      (plotOpts!.visibleEndTimeSec - plotOpts!.visibleStartTimeSec)) *
      plotWidth;

  await new Promise((resolve) => setTimeout(resolve, 0));

  // Calculate value scaling
  const valueToPixel = (v: number) =>
    plotOpts!.margins.top +
    plotHeight -
    ((v - yMin) / (yMax - yMin)) * plotHeight;

  // Clear canvas
  ctx.clearRect(0, 0, plotOpts.canvasWidth, plotOpts.canvasHeight);

  // Set up clipping region for plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(plotOpts.margins.left, plotOpts.margins.top, plotWidth, plotHeight);
  ctx.clip();

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
  let timer = Date.now();
  for (let i = 0; i < plotData.data.length; i++) {
    const channel = plotData.data[i];
    const offset = channelOffset(
      plotData.data.length,
      i,
      plotOpts.channelSeparation,
      avgStdDev,
    );

    ctx.strokeStyle = colors[i % colors.length];
    ctx.beginPath();

    // Plot points
    for (let j = 0; j < channel.length; j++) {
      const x = timeToPixel(plotData.timestamps[j]);
      const y = valueToPixel(channel[j] + offset);
      if (j === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      if (j % 10000 === 0) {
        if (Date.now() - timer > 100) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          timer = Date.now();
        }
      }
    }

    ctx.stroke();
  }

  // Restore context state (removes clipping)
  ctx.restore();
};

let drawing = false;
let scheduled = false;
const throttledDraw = async () => {
  if (!drawing) {
    drawing = true;
    try {
      await draw();
    } finally {
      drawing = false;
    }
  } else {
    if (scheduled) return;
    scheduled = true;
    while (drawing) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    scheduled = false;
    await throttledDraw();
  }
};

onmessage = (e: MessageEvent) => {
  if (e.data.canvas) {
    canvas = e.data.canvas as OffscreenCanvas;
  }
  if (e.data.plotOpts) {
    plotOpts = e.data.plotOpts;
    throttledDraw();
  }
  if (e.data.plotData) {
    plotData = e.data.plotData;
    doPlotDataCalculations();
    throttledDraw();
  }
};
