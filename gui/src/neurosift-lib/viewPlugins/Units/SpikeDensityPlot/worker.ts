import { Opts, MatrixData } from "./WorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined;
let opts: Opts | undefined = undefined;
let matrixData: MatrixData | undefined = undefined;
let maxSpikeCount: number | undefined = undefined;
// let plotDataFiltered: PlotData | undefined = undefined

onmessage = function (evt) {
  if (evt.data.canvas !== undefined) {
    canvas = evt.data.canvas;
    drawDebounced();
  }
  if (evt.data.opts !== undefined) {
    opts = evt.data.opts;
    drawDebounced();
  }
  if (evt.data.matrixData !== undefined) {
    matrixData = evt.data.matrixData;
    if (!matrixData) throw Error("Unexpected: matrixData is undefined");
    maxSpikeCount = getMax(matrixData.spikeCounts);
    drawDebounced();
  }
};

function debounce(f: () => void, msec: number) {
  let scheduled = false;
  return () => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      f();
    }, msec);
  };
}

// let drawCode = 0;
async function draw() {
  if (!canvas) return;
  if (!opts) return;

  const {
    margins,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    isort,
  } = opts;

  // this is important because main thread no longer has control of canvas (it seems)
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) return;

  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

  if (!matrixData) {
    // draw loading text in the center of the canvas
    canvasContext.fillStyle = "gray";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.font = "20px Arial";
    canvasContext.fillText("Loading...", canvasWidth / 2, canvasHeight / 2);
    return;
  }
  // drawCode += 1;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const thisDrawCode = drawCode;

  const inverseIsort = isort
    ? isort
        .map((x, i) => [x, i])
        .sort((a, b) => a[0] - b[0])
        .map((x) => x[1])
    : undefined;

  const numUnits = matrixData.numUnits;
  const unitIndexToY = (unitIndex: number) => {
    let ii = unitIndex;
    if (inverseIsort !== undefined) {
      ii = inverseIsort[unitIndex];
    }
    return (
      canvasHeight -
      margins.bottom -
      ((ii + 0.5 - 0) / (numUnits - 0)) *
        (canvasHeight - margins.top - margins.bottom)
    );
  };

  const tToX = (t: number) =>
    margins.left +
    ((t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)) *
      (canvasWidth - margins.left - margins.right);

  const pixelPlots: PixelPlot[] = [];
  for (let i = 0; i < matrixData.numUnits; i++) {
    pixelPlots.push({
      y: unitIndexToY(i),
      startBinPixel: tToX(matrixData.startTimeSec),
      binSizePixel:
        tToX(matrixData.startTimeSec + matrixData.binSizeSec) -
        tToX(matrixData.startTimeSec),
      spikeCounts: matrixData.spikeCounts.slice(
        i * matrixData.numBins,
        (i + 1) * matrixData.numBins,
      ),
      unitId: i,
      color: "black",
      hovered: false,
      selected: false,
    });
  }
  paintPanel(canvasContext, pixelPlots);
}

type PixelPlot = {
  y: number;
  startBinPixel: number;
  binSizePixel: number;
  spikeCounts: number[];
  unitId: string | number;
  color: string;
  hovered: boolean;
  selected: boolean;
};

const paintPanel = (
  context: CanvasRenderingContext2D,
  pixelPlots: PixelPlot[],
) => {
  if (!opts) return;
  const { margins, canvasWidth, canvasHeight } = opts;

  // context.clearRect(0, 0, canvasWidth, canvasHeight)

  const pixelsPerUnit = canvasHeight / pixelPlots.length;

  // do this before clipping
  for (const pass of [1, 2, 3]) {
    pixelPlots.forEach((pPlot) => {
      if (
        (pass === 1 && pixelsPerUnit >= 10) ||
        (pass === 2 && pPlot.selected) ||
        (pass === 3 && pPlot.hovered)
      ) {
        context.fillStyle =
          pass === 1 ? pPlot.color : pass === 2 ? "black" : pPlot.color;
        context.textAlign = "right";
        context.textBaseline = "middle";
        context.font = `${pass > 1 ? "bold " : ""}12px Arial`;
        context.fillText(pPlot.unitId + "", margins.left - 4, pPlot.y);

        if (pass === 3 || (pass === 2 && pPlot.hovered)) {
          context.textAlign = "left";
          context.textBaseline = "middle";
          context.font = `${pass > 1 ? "bold " : ""}12px Arial`;
          context.fillText(
            pPlot.unitId + "",
            canvasWidth - margins.right + 4,
            pPlot.y,
          );
        }
      }
    });
  }

  context.save();
  context.beginPath();
  context.rect(
    margins.left,
    margins.top,
    canvasWidth - margins.left - margins.right,
    canvasHeight - margins.top - margins.bottom,
  );
  context.clip();

  pixelPlots.forEach((pPlot) => {
    if (maxSpikeCount === undefined) {
      console.warn("maxSpikeCount is undefined");
      return;
    }
    for (let i = 0; i < pPlot.spikeCounts.length; i++) {
      const x0 = pPlot.startBinPixel + i * pPlot.binSizePixel;
      const x1 = x0 + pPlot.binSizePixel;
      const y0 = pPlot.y - 2;
      const y1 = pPlot.y + 2;
      if (pPlot.spikeCounts[i] > 0) {
        fillRect(context, x0, y0, x1, y1, pPlot.spikeCounts[i] / maxSpikeCount);
      }
    }
  });

  context.restore();
};

const fillRect = (
  context: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  value: number,
) => {
  context.fillStyle = colorForValue(value);
  context.beginPath();
  context.rect(x0, y0, x1 - x0, y1 - y0);
  context.fill();
};

const colorForValue = (value: number) => {
  const v = 128 - Math.floor((value * 255) / 2);
  return `rgb(${v},${v},${v})`;
};

const drawDebounced = debounce(draw, 10);

const getMax = (arr: number[]) => {
  if (arr.length === 0) return 0;
  let max = arr[0];
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
};

// export { }
