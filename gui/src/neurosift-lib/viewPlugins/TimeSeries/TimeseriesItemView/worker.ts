import {
  Opts,
  DataSeries,
  TimeseriesAnnotationFileData,
  SpikeTrainsDataForWorker,
} from "./WorkerTypes";

let canvas: HTMLCanvasElement | undefined = undefined;
let opts: Opts | undefined = undefined;
let dataSeries: DataSeries[] | undefined = undefined;
let plotSeries: PlotSeries[] | undefined = undefined;
let annotation: TimeseriesAnnotationFileData | undefined = undefined;
let spikeTrains: SpikeTrainsDataForWorker | undefined = undefined;
let zoomInRequiredForSpikeTrains = false;

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
  if (evt.data.annotation) {
    annotation = evt.data.annotation;
    drawDebounced();
  }
  if (evt.data.spikeTrains) {
    spikeTrains = evt.data.spikeTrains;
    drawDebounced();
  }
  if (evt.data.zoomInRequiredForSpikeTrains !== undefined) {
    console.log(evt.data.zoomInRequiredForSpikeTrains);
    zoomInRequiredForSpikeTrains = evt.data.zoomInRequiredForSpikeTrains;
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
let drawCode = 0;
async function draw() {
  if (!canvas) return;
  if (!opts) return;

  const {
    margins,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    minValue,
    maxValue,
  } = opts;

  // this is important because main thread no longer has control of canvas (it seems)
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) return;
  drawCode += 1;
  const thisDrawCode = drawCode;

  canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);

  if (opts.zoomInRequired && !zoomInRequiredForSpikeTrains) {
    // draw text in the center of the canvas in pink: "Zoom in to view raster plot"
    canvasContext.fillStyle = "pink";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.font = "20px Arial";
    canvasContext.fillText(
      "Zoom in (mouse-wheel) to view data",
      canvasWidth / 2,
      canvasHeight / 2,
    );
  }

  if (zoomInRequiredForSpikeTrains) {
    // draw text in the center of the canvas in pink: "Zoom in to view spike trains"
    canvasContext.fillStyle = "pink";
    canvasContext.textAlign = "center";
    canvasContext.textBaseline = "middle";
    canvasContext.font = "20px Arial";
    canvasContext.fillText(
      "Zoom in (mouse-wheel) to view spike trains",
      canvasWidth / 2,
      canvasHeight / 2,
    );
  }

  if (spikeTrains && !zoomInRequiredForSpikeTrains) {
    await drawSpikeTrains({
      canvasContext,
      canvasWidth,
      canvasHeight,
      visibleStartTimeSec,
      visibleEndTimeSec,
      margins,
      spikeTrains,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // for (const pass of plotSeries ? [1, 2] : [1]) {
  for (const _ of [1]) {
    if (thisDrawCode !== drawCode) return;

    const timer = Date.now();
    //if (pass === 2 || !plotSeries) {
    plotSeries = dataSeries ? computePlotSeries(dataSeries) : undefined;
    //}
    const coordToPixel = (p: {
      x: number;
      y: number;
    }): { x: number; y: number } => {
      return {
        x:
          margins.left +
          ((p.x - visibleStartTimeSec) /
            (visibleEndTimeSec - visibleStartTimeSec)) *
            (canvasWidth - margins.left - margins.right),
        y: !isNaN(p.y)
          ? canvasHeight -
            margins.bottom -
            ((p.y - minValue) / (maxValue - minValue)) *
              (canvasHeight - margins.top - margins.bottom)
          : NaN,
      };
    };

    const pixelZero = coordToPixel({ x: 0, y: 0 }).y;
    const pixelData = (plotSeries || []).map((s, i) => {
      return {
        dimensionIndex: i,
        dimensionLabel: `${i}`,
        pixelTimes: s.times.map((t) => coordToPixel({ x: t, y: 0 }).x),
        pixelValues: s.values.map((y) => coordToPixel({ x: 0, y }).y),
        type: s.type,
        attributes: s.attributes,
      };
    });
    const panelProps: PanelProps = {
      pixelZero: pixelZero,
      dimensions: pixelData,
    };
    paintPanel(canvasContext, panelProps);

    // the wait time is equal to the render time
    const elapsed = Date.now() - timer;
    await sleepMsec(elapsed);
  }

  if (annotation) {
    await drawAnnotation({
      canvasContext,
      canvasWidth,
      canvasHeight,
      visibleStartTimeSec,
      visibleEndTimeSec,
      margins,
      annotation,
    });
  }
}

const drawDebounced = debounce(draw, 10);

const paintLegend = (context: CanvasRenderingContext2D) => {
  if (!opts) return;
  if (opts.hideLegend) return;
  if (!dataSeries) return;
  const { legendOpts, margins, canvasWidth } = opts;
  const seriesToInclude = dataSeries.filter((s) => s.title);
  if (seriesToInclude.length === 0) return;
  const { location } = legendOpts;
  const entryHeight = 18;
  const entryFontSize = 12;
  const symbolWidth = 50;
  const legendWidth = 200;
  const margin = 10;
  const legendHeight = 20 + seriesToInclude.length * entryHeight;
  const R =
    location === "northwest"
      ? {
          x: margins.left + 20,
          y: margins.top + 20,
          w: legendWidth,
          h: legendHeight,
        }
      : location === "northeast"
        ? {
            x: canvasWidth - margins.right - legendWidth - 20,
            y: margins.top + 20,
            w: legendWidth,
            h: legendHeight,
          }
        : undefined;
  if (!R) return; //unexpected
  context.fillStyle = "white";
  context.strokeStyle = "gray";
  context.lineWidth = 1.5;
  context.fillRect(R.x, R.y, R.w, R.h);
  context.strokeRect(R.x, R.y, R.w, R.h);

  seriesToInclude.forEach((s, i) => {
    const y0 = R.y + margin + i * entryHeight;
    const symbolRect = {
      x: R.x + margin,
      y: y0,
      w: symbolWidth,
      h: entryHeight,
    };
    const titleRect = {
      x: R.x + margin + symbolWidth + margin,
      y: y0,
      w: legendWidth - margin - margin - symbolWidth - margin,
      h: entryHeight,
    };
    const title = s.title || "untitled";
    context.fillStyle = "black";
    context.font = `${entryFontSize}px Arial`;
    context.fillText(
      title,
      titleRect.x,
      titleRect.y + titleRect.h / 2 + entryFontSize / 2,
    );
    if (s.type === "line") {
      applyLineAttributes(context, s.attributes);
      context.beginPath();
      context.moveTo(symbolRect.x, symbolRect.y + symbolRect.h / 2);
      context.lineTo(
        symbolRect.x + symbolRect.w,
        symbolRect.y + symbolRect.h / 2,
      );
      context.stroke();
      context.setLineDash([]);
    } else if (s.type === "marker") {
      applyMarkerAttributes(context, s.attributes);
      const radius = entryHeight * 0.3;
      const shape = s.attributes["shape"] ?? "circle";
      const center = {
        x: symbolRect.x + symbolRect.w / 2,
        y: symbolRect.y + symbolRect.h / 2,
      };
      if (shape === "circle") {
        context.beginPath();
        context.ellipse(center.x, center.y, radius, radius, 0, 0, 2 * Math.PI);
        context.fill();
      } else if (shape === "square") {
        context.fillRect(
          center.x - radius,
          center.y - radius,
          radius * 2,
          radius * 2,
        );
      }
    }
  });
};

type PanelProps = {
  pixelZero: number;
  dimensions: {
    dimensionIndex: number;
    dimensionLabel: string;
    pixelTimes: number[];
    pixelValues: number[];
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: { [key: string]: any };
  }[];
};

const paintPanel = (context: CanvasRenderingContext2D, props: PanelProps) => {
  if (!opts) return;

  const { margins, canvasWidth, canvasHeight } = opts;

  // context.clearRect(0, 0, canvasWidth, canvasHeight);

  if (opts.zoomInRequired) {
    return;
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

  // don't display dashed zero line (Eric's request)
  // context.strokeStyle = 'black'
  // context.setLineDash([5, 15]);
  // context.lineWidth = 1
  // context.beginPath()
  // context.moveTo(0, props.pixelZero)
  // context.lineTo(panelWidth, props.pixelZero)
  // context.stroke()
  // context.setLineDash([]);

  // eslint-disable-next-line react/prop-types
  props.dimensions.forEach((dim) => {
    if (dim.type === "line") {
      applyLineAttributes(context, dim.attributes);
      context.beginPath();
      let lastIsUndefined = true;
      dim.pixelTimes.forEach((x, ii) => {
        const y = dim.pixelValues[ii];
        if (y === undefined || isNaN(y)) {
          lastIsUndefined = true;
        } else {
          lastIsUndefined ? context.moveTo(x, y) : context.lineTo(x, y);
          lastIsUndefined = false;
        }
      });
      context.stroke();
      context.setLineDash([]);
    } else if (dim.type === "marker") {
      applyMarkerAttributes(context, dim.attributes);
      const radius = dim.attributes["radius"] ?? 2;
      const shape = dim.attributes["shape"] ?? "circle";
      if (shape === "circle") {
        dim.pixelTimes.forEach((t, ii) => {
          context.beginPath();
          context.ellipse(
            t,
            dim.pixelValues[ii],
            radius,
            radius,
            0,
            0,
            2 * Math.PI,
          );
          context.fill();
        });
      } else if (shape === "square") {
        dim.pixelTimes.forEach((t, ii) => {
          context.fillRect(
            t - radius,
            dim.pixelValues[ii] - radius,
            radius * 2,
            radius * 2,
          );
        });
      }
    }
  });

  paintLegend(context);

  context.restore();
};

type PlotSeries = {
  type: string;
  times: number[];
  values: number[];
  attributes: { [key: string]: any };
};

const computePlotSeries = (dataSeries: DataSeries[]): PlotSeries[] => {
  const plotSeries: PlotSeries[] = [];

  if (!opts) return plotSeries;
  const { visibleStartTimeSec, visibleEndTimeSec } = opts;

  if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined) {
    return plotSeries;
  }
  dataSeries.forEach((rs) => {
    const tt = rs.t;
    const yy = rs.y;
    const filteredTimeIndices: number[] = tt.flatMap(
      (t: number, ii: number) => {
        // give a buffer of 10 timepoints before and after the visible range
        // so that we don't have to worry about lines not getting rendered properly
        const ii1 = Math.min(tt.length - 1, ii + 10);
        const ii2 = Math.max(0, ii - 10);
        const tt1 = tt[ii1];
        const tt2 = tt[ii2];
        if (tt1 >= visibleStartTimeSec && tt2 <= visibleEndTimeSec) {
          return ii;
        } else {
          return [];
        }
      },
    );

    ////////////////////////////////////////////////////////////////////////////////

    const filteredTimes = filteredTimeIndices.map((i) => tt[i]);
    const filteredValues = filteredTimeIndices.map((index) => yy[index]);
    plotSeries.push({
      type: rs.type,
      times: filteredTimes,
      values: filteredValues,
      attributes: rs.attributes,
    });
  });
  return plotSeries;
};

const applyLineAttributes = (
  context: CanvasRenderingContext2D,
  attributes: any,
) => {
  context.strokeStyle = attributes["color"] ?? "black";
  context.lineWidth = attributes["width"] ?? 1.1; // 1.1 hack--but fixes the 'disappearing lines' issue
  attributes["dash"] && context.setLineDash(attributes["dash"]);
};

const applyMarkerAttributes = (
  context: CanvasRenderingContext2D,
  attributes: any,
) => {
  context.fillStyle = attributes["color"] ?? "black";
};

function sleepMsec(msec: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, msec);
  });
}

const drawSpikeTrains = async (o: {
  canvasContext: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  margins: { left: number; right: number; top: number; bottom: number };
  spikeTrains: SpikeTrainsDataForWorker;
}) => {
  const {
    canvasContext,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    margins,
    spikeTrains,
  } = o;

  for (const x of spikeTrains) {
    const { unitId, spikeTimesSec } = x;
    for (const t of spikeTimesSec) {
      if (t < visibleStartTimeSec || t > visibleEndTimeSec) continue;
      const x0 =
        margins.left +
        ((t - visibleStartTimeSec) /
          (visibleEndTimeSec - visibleStartTimeSec)) *
          (canvasWidth - margins.left - margins.right);
      const y1 = margins.top;
      const y2 = canvasHeight - margins.bottom;
      canvasContext.strokeStyle = x.color;
      canvasContext.beginPath();
      canvasContext.moveTo(x0, y1);
      canvasContext.lineTo(x0, y2);
      canvasContext.stroke();

      canvasContext.fillStyle = x.color;
      const text = `${unitId}`;
      canvasContext.font = "12px Arial";
      canvasContext.textAlign = "center";
      canvasContext.textBaseline = "bottom";
      canvasContext.fillText(text, x0, y1);
    }
  }
};

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// BEGIN drawAnnotation
///////////////////////////////////////////////////////////////////////////////////////////////////////////
let drawAnnotationDrawCode = 0;

const drawAnnotation = async (o: {
  canvasContext: CanvasRenderingContext2D;
  canvasWidth: number;
  canvasHeight: number;
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  margins: { left: number; right: number; top: number; bottom: number };
  annotation: TimeseriesAnnotationFileData;
}) => {
  drawAnnotationDrawCode += 1;
  const thisDrawAnnotationDrawCode = drawAnnotationDrawCode;

  const {
    canvasContext,
    canvasWidth,
    canvasHeight,
    visibleStartTimeSec,
    visibleEndTimeSec,
    margins,
    annotation,
  } = o;

  const { events, event_types } = annotation;

  const eventsFiltered = events.filter(
    (e) => e.s <= visibleEndTimeSec && e.e >= visibleStartTimeSec,
  );

  const colors = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
    [255, 0, 255],
    [0, 255, 255],
    [255, 128, 0],
    [255, 0, 128],
    [128, 255, 0],
    [0, 255, 128],
    [128, 0, 255],
    [0, 128, 255],
  ] as [number, number, number][];
  const colorsForEventTypes: { [key: string]: [number, number, number] } = {};
  for (const et of event_types) {
    const color = colors[et.color_index % colors.length];
    colorsForEventTypes[et.event_type] = color;
  }

  let timer = Date.now();
  for (const pass of ["rect", "line"]) {
    for (const e of eventsFiltered) {
      if (thisDrawAnnotationDrawCode !== drawAnnotationDrawCode) return;

      const color = colorsForEventTypes[e.t];
      if (e.e > e.s) {
        if (pass !== "rect") continue;
        const R = {
          x:
            margins.left +
            ((e.s - visibleStartTimeSec) /
              (visibleEndTimeSec - visibleStartTimeSec)) *
              (canvasWidth - margins.left - margins.right),
          y: margins.top,
          w:
            ((e.e - e.s) / (visibleEndTimeSec - visibleStartTimeSec)) *
            (canvasWidth - margins.left - margins.right),
          h: canvasHeight - margins.top - margins.bottom,
        };
        canvasContext.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.3)`;
        canvasContext.fillRect(R.x, R.y, R.w, R.h);
        const elapsed = Date.now() - timer;
        if (elapsed > 100) {
          await sleepMsec(elapsed);
          timer = Date.now();
        }
      } else {
        if (pass !== "line") continue;
        const pt1 = {
          x:
            margins.left +
            ((e.s - visibleStartTimeSec) /
              (visibleEndTimeSec - visibleStartTimeSec)) *
              (canvasWidth - margins.left - margins.right),
          y: margins.top,
        };
        const pt2 = {
          x: pt1.x,
          y: canvasHeight - margins.bottom,
        };
        canvasContext.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},1)`;
        canvasContext.beginPath();
        canvasContext.moveTo(pt1.x, pt1.y);
        canvasContext.lineTo(pt2.x, pt2.y);
        canvasContext.stroke();
      }
    }
  }
  function sleepMsec(msec: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, msec);
    });
  }
};
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// END drawAnnotation
///////////////////////////////////////////////////////////////////////////////////////////////////////////

// export { }
