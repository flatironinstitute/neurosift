let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;

type PlotData = {
  unitIds: string[];
  spikeTimes: number[][];
};

type PlotOpts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  zoomInRequired?: boolean;
};

let plotData: PlotData | null = null;
let plotOpts: PlotOpts | null = null;

const paint = () => {
  if (!canvas || !ctx || !plotData || !plotOpts) return;

  const {
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = plotOpts;

  // Clear canvas
  ctx!.clearRect(0, 0, canvasWidth, canvasHeight);

  const duration = visibleEndTimeSec - visibleStartTimeSec;
  const pixelsPerTimeSec =
    (canvasWidth - margins.left - margins.right) / duration;
  const pixelsPerUnit =
    (canvasHeight - margins.top - margins.bottom) / plotData.unitIds.length;

  // Draw spikes as vertical lines
  ctx!.strokeStyle = "black";
  ctx!.lineWidth = 1;

  plotData.spikeTimes.forEach((spikes, unitIndex) => {
    const y = margins.top + (unitIndex + 0.5) * pixelsPerUnit;
    spikes.forEach((spikeTime) => {
      if (
        !ctx ||
        spikeTime < visibleStartTimeSec ||
        spikeTime > visibleEndTimeSec
      )
        return;
      const x =
        margins.left + (spikeTime - visibleStartTimeSec) * pixelsPerTimeSec;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x, y + 8);
      ctx.stroke();
    });
  });
};

self.onmessage = (e: MessageEvent) => {
  if (e.data.canvas) {
    const newCanvas = e.data.canvas as OffscreenCanvas;
    canvas = newCanvas;
    const newCtx = newCanvas.getContext("2d");
    if (!newCtx) throw new Error("Failed to get 2d context");
    ctx = newCtx;
    return;
  }
  if (e.data.plotData) {
    plotData = e.data.plotData;
    paint();
    return;
  }
  if (e.data.plotOpts) {
    plotOpts = e.data.plotOpts;
    if (canvas && plotOpts) {
      canvas.width = plotOpts.canvasWidth;
      canvas.height = plotOpts.canvasHeight;
    }
    paint();
    return;
  }
};
