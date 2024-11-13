import { Opts, DataSeries } from "./SpatialWorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined;
let opts: Opts | undefined = undefined;
let dataSeries: DataSeries | undefined = undefined;

type Tick = {
  value: number;
  major: boolean;
};

const xTargetTickSpacingPx = 180;
const ytargetTickSpacingPx = 80;

const getTicks = (
  min: number,
  max: number,
  numPixels: number,
  targetTickSpacingPx: number,
): Tick[] => {
  const dataRange = max - min;
  if (!dataRange) return [];
  // get the step size for the ticks
  // stepSize / dataRange * numPixels ~= tickSpacingPx
  // stepSize ~= tickSpacingPx * dataRange / numPixels
  const stepSizeCandidateMinBase = Math.floor(
    Math.log10((targetTickSpacingPx * dataRange) / numPixels),
  );
  const candidateMultipliers = [1, 2, 5];
  const candidateStepSizes = candidateMultipliers.map(
    (m) => m * Math.pow(10, stepSizeCandidateMinBase),
  );
  const distances = candidateStepSizes.map((s) =>
    Math.abs(s - (targetTickSpacingPx * dataRange) / numPixels),
  );
  const bestIndex = distances.indexOf(Math.min(...distances));
  const bestStepSize = candidateStepSizes[bestIndex];

  const i1 = Math.ceil(min / bestStepSize);
  const i2 = Math.floor(max / bestStepSize);
  const ticks: Tick[] = [];
  for (let i = i1; i <= i2; i++) {
    const v = i * bestStepSize;
    ticks.push({
      value: v,
      major: false, // fix this
    });
  }
  return ticks;
};

onmessage = function (evt) {
  if (evt.data.canvas) {
    canvas = evt.data.canvas;
    drawDebounced();
  }
  if (evt.data.opts) {
    opts = evt.data.opts;
    drawDebounced();
  }
  if (evt.data.dataSeries) {
    dataSeries = evt.data.dataSeries;
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
  if (!dataSeries) return;

  const {
    margins,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    xMin,
    xMax,
    yMin,
    yMax,
    xAxisLabel,
    yAxisLabel,
  } = opts;

  // this is important because main thread no longer has control of canvas (it seems)
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) return;
  // drawCode += 1;
  // const thisDrawCode = drawCode;

  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

  // const timer = Date.now();

  const scale = Math.min(
    (canvasWidth - margins.left - margins.right) / (xMax - xMin),
    (canvasHeight - margins.top - margins.bottom) / (yMax - yMin),
  );
  const offsetX =
    (canvasWidth - margins.left - margins.right - (xMax - xMin) * scale) / 2;
  const offsetY =
    (canvasHeight - margins.top - margins.bottom - (yMax - yMin) * scale) / 2;
  const coordToPixel = (p: { x: number; y: number }) => {
    return {
      x: !isNaN(p.x) ? margins.left + offsetX + (p.x - xMin) * scale : NaN,
      y: !isNaN(p.y)
        ? canvasHeight - margins.bottom - offsetY - (p.y - yMin) * scale
        : NaN,
    };
  };

  const formatTickLabel = (value: number) => {
    // do not have excess zeros on the right
    const s = value.toFixed(10);
    const i = s.indexOf(".");
    if (i < 0) return s;
    let j = s.length - 1;
    while (j > i) {
      if (s[j] !== "0") break;
      j--;
    }
    // remove a trailing decimal point
    if (s[j] === ".") j--;
    return s.slice(0, j + 1);
  };

  const xTicks = getTicks(
    xMin,
    xMax,
    canvasWidth - margins.left - margins.right,
    xTargetTickSpacingPx,
  );
  const drawXAxis = () => {
    const p1 = coordToPixel({ x: xMin, y: yMin });
    const p2 = coordToPixel({ x: xMax, y: yMin });
    canvasContext.beginPath();
    canvasContext.moveTo(p1.x, p1.y);
    canvasContext.lineTo(p2.x, p2.y);
    canvasContext.strokeStyle = "rgb(0,0,0)";
    canvasContext.stroke();

    for (const tick of xTicks) {
      const p = coordToPixel({ x: tick.value, y: yMin });
      canvasContext.beginPath();
      canvasContext.moveTo(p.x, p.y);
      canvasContext.lineTo(p.x, p.y + 5);
      canvasContext.strokeStyle = "rgb(0,0,0)";
      canvasContext.stroke();

      // draw the tick label
      canvasContext.font = "12px sans-serif";
      canvasContext.fillStyle = "rgb(0,0,0)";
      canvasContext.textAlign = "center";
      canvasContext.textBaseline = "top";
      canvasContext.fillText(formatTickLabel(tick.value), p.x, p.y + 7);
    }

    // draw the axis label
    canvasContext.font = "12px sans-serif";
    canvasContext.fillStyle = "rgb(0,0,0)";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "top";
    canvasContext.fillText(xAxisLabel, (p1.x + p2.x) / 2, p1.y + 18);
  };
  drawXAxis();

  const yTicks = getTicks(
    yMin,
    yMax,
    canvasHeight - margins.top - margins.bottom,
    ytargetTickSpacingPx,
  );
  const drawYAxis = () => {
    const p1 = coordToPixel({ x: xMin, y: yMin });
    const p2 = coordToPixel({ x: xMin, y: yMax });
    canvasContext.beginPath();
    canvasContext.moveTo(p1.x, p1.y);
    canvasContext.lineTo(p2.x, p2.y);
    canvasContext.strokeStyle = "rgb(0,0,0)";
    canvasContext.stroke();

    for (const tick of yTicks) {
      const p = coordToPixel({ x: xMin, y: tick.value });
      canvasContext.beginPath();
      canvasContext.moveTo(p.x, p.y);
      canvasContext.lineTo(p.x - 5, p.y);
      canvasContext.strokeStyle = "rgb(0,0,0)";
      canvasContext.stroke();

      // draw the tick label
      canvasContext.font = "12px sans-serif";
      canvasContext.fillStyle = "rgb(0,0,0)";
      canvasContext.textAlign = "right";
      canvasContext.textBaseline = "middle";
      canvasContext.fillText(formatTickLabel(tick.value), p.x - 7, p.y);
    }

    // draw the axis label as vertical text
    canvasContext.font = "12px sans-serif";
    canvasContext.fillStyle = "rgb(0,0,0)";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "top";
    canvasContext.save();
    canvasContext.translate(p1.x - 45, (p1.y + p2.y) / 2);
    canvasContext.rotate(-Math.PI / 2);
    canvasContext.fillText(yAxisLabel, 0, 0);
    canvasContext.restore();
  };
  drawYAxis();

  const tToColor = (t: number) => {
    const frac =
      (t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec);
    const r = 0;
    const g = Math.floor(255 * (1 - frac));
    const b = Math.floor(255 * frac);
    return `rgb(${r},${g},${b})`;
  };
  let lastPixelPoint: { x: number; y: number } | undefined = undefined;
  for (let i = 0; i < dataSeries.t.length; i++) {
    const tt = dataSeries.t[i];
    if (tt < visibleStartTimeSec || tt > visibleEndTimeSec) continue;
    const vx = dataSeries.x[i];
    const vy = dataSeries.y[i];
    if (isNaN(vx) || isNaN(vy)) {
      lastPixelPoint = undefined;
    } else {
      const pp = coordToPixel({ x: dataSeries.x[i], y: dataSeries.y[i] });
      if (lastPixelPoint) {
        canvasContext.beginPath();
        canvasContext.moveTo(lastPixelPoint.x, lastPixelPoint.y);
        canvasContext.lineTo(pp.x, pp.y);
        canvasContext.strokeStyle = tToColor(tt);
        canvasContext.stroke();
      }
      lastPixelPoint = pp;
    }
  }
}

const drawDebounced = debounce(draw, 10);

// function sleepMsec(msec: number) {
//   return new Promise((resolve) => {
//     setTimeout(resolve, msec);
//   });
// }

// export { }
