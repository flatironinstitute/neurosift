import { Opts, BehavioralEventsData } from "./WorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined;
let opts: Opts | undefined = undefined;
let beData: BehavioralEventsData | undefined = undefined;

onmessage = function (evt) {
  if (evt.data.canvas) {
    canvas = evt.data.canvas;
    drawDebounced();
  }
  if (evt.data.opts) {
    opts = evt.data.opts;
    drawDebounced();
  }
  if (evt.data.beData) {
    beData = evt.data.beData;
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

const altneratingColors = ["#ececec", "#dfdfdf"];

const categoryColors = [
  "#000",
  "#00f",
  "#0f0",
  "#f00",
  "#ff0",
  "#f0f",
  "#0ff",
  "#800",
  "#080",
  "#008",
  "#880",
  "#808",
  "#088",
];

let drawCode = 0;
async function draw() {
  if (!canvas) return;
  if (!opts) return;
  if (!beData) return;

  const thisDrawCode = ++drawCode;

  const {
    margins,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = opts;

  // this is important because main thread no longer has control of canvas (it seems)
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const numSeries = beData.seriesNames.length;
  const coordToPix = (t: number, seriesIndex: number) => {
    if (visibleStartTimeSec === undefined) return { x: 0, y: 0 };
    if (visibleEndTimeSec === undefined) return { x: 0, y: 0 };
    const x =
      margins.left +
      ((t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)) *
        (canvasWidth - margins.left - margins.right);
    const y =
      margins.top +
      ((seriesIndex + 0.5) * (canvasHeight - margins.top - margins.bottom)) /
        (numSeries || 1);
    return { x, y };
  };

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  for (let i = 0; i < beData.seriesNames.length; i++) {
    // fill a rect for this row
    const color = altneratingColors[i % altneratingColors.length];
    ctx.fillStyle = color;
    const p1 = coordToPix(visibleStartTimeSec, i - 0.5);
    const p2 = coordToPix(visibleEndTimeSec, i + 0.5);
    ctx.fillRect(0, p1.y, canvasWidth, p2.y - p1.y);

    const seriesName = beData.seriesNames[i];
    const p = coordToPix(visibleStartTimeSec, i);
    // draw label right-aligned at p.x, p.y
    ctx.fillStyle = "black";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(seriesName, p.x - 10, p.y);
  }

  let timer = Date.now();
  for (let i = 0; i < beData.seriesNames.length; i++) {
    const seriesName = beData.seriesNames[i];
    const series = beData.series[seriesName];
    if (!series) continue;
    const { categories, timestamps, data } = series;
    const colorsForCategories: { [category: string]: string } = {};
    for (let j = 0; j < categories.length; j++) {
      const category = categories[j] + "";
      colorsForCategories[category] = categoryColors[j % categoryColors.length];
    }
    ctx.font = "12px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    for (let j = 0; j < timestamps.length; j++) {
      const t = timestamps[j];
      const v = data[j];
      if (t < visibleStartTimeSec) continue;
      if (t > visibleEndTimeSec) continue;
      const p = coordToPix(t, i);
      // fill a circle centered at p.x, p.y
      ctx.fillStyle = colorsForCategories[v + ""] || "black";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillText(v, p.x + 5, p.y + 1);
    }
    const elapsed = Date.now() - timer;
    if (elapsed > 200) {
      await new Promise((r) => setTimeout(r, 10));
      if (thisDrawCode !== drawCode) return;
      timer = Date.now();
    }
  }
}

const drawDebounced = debounce(draw, 10);

// export { }
