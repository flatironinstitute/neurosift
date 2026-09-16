/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getTicks } from "./getTicks";

type TrialAlignedSeriesWidgetProps = {
  width: number;
  height: number;
  trials: { times: number[]; roiValues?: number[]; group: any }[];
  groups: { group: any; color: string }[];
  windowRange: { start: number; end: number };
  alignmentVariableName: string;
  // Display options (all optional; defaults preserve the original behavior).
  showRawTraces?: boolean; // draw the per-trial traces (default true)
  rawTraceAlpha?: number; // opacity of the per-trial traces, 0-1 (default 1)
  showStdBand?: boolean; // draw dashed mean +/- N*std lines (default false)
  stdMultiple?: number; // the multiple N of std for the band (default 1)
  yAxisLabel?: string; // label for the value axis (default "ROI")
  // Compute the mean (and std band) separately per group, drawn in each
  // group's color, instead of a single black mean across all trials.
  // Default false preserves the original behavior.
  perGroupStats?: boolean;
};

type AverageCurve = {
  color: string;
  times: number[];
  values: number[];
  stds: number[];
};

// Mean and sample standard deviation of a set of traces interpolated onto a
// common time grid.
const computeMeanStd = (
  plots: { times: number[]; values: number[] }[],
  times: number[],
): { values: number[]; stds: number[] } => {
  const n = times.length;
  const valueSums = new Array(n).fill(0);
  const valueSqSums = new Array(n).fill(0);
  const valueCounts = new Array(n).fill(0);
  for (const plot of plots) {
    const values = interpolateOntoGrid(plot.times, plot.values, times);
    for (let i = 0; i < n; i++) {
      if (!isNaN(values[i])) {
        valueSums[i] += values[i];
        valueSqSums[i] += values[i] * values[i];
        valueCounts[i] += 1;
      }
    }
  }
  const values: number[] = [];
  const stds: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = valueCounts[i];
    if (c !== 0) {
      const mean = valueSums[i] / c;
      values.push(mean);
      if (c > 1) {
        const variance = Math.max(
          0,
          (valueSqSums[i] - c * mean * mean) / (c - 1),
        );
        stds.push(Math.sqrt(variance));
      } else {
        stds.push(NaN);
      }
    } else {
      values.push(NaN);
      stds.push(NaN);
    }
  }
  return { values, stds };
};

const TrialAlignedSeriesWidget: FunctionComponent<
  TrialAlignedSeriesWidgetProps
> = ({
  width,
  height,
  trials,
  groups,
  windowRange,
  showRawTraces = true,
  rawTraceAlpha = 1,
  showStdBand = false,
  stdMultiple = 1,
  yAxisLabel = "ROI",
  perGroupStats = false,
}) => {
  const plots: {
    times: number[];
    values: number[];
    color: string;
  }[] = useMemo(() => {
    const colorsByGroup: { [key: number | string]: string } = {};
    for (const g of groups) {
      colorsByGroup[g.group] = g.color;
    }
    const ret: { times: number[]; values: number[]; color: string }[] = [];
    for (let j = 0; j < trials.length; j++) {
      const groupColor = colorsByGroup[trials[j].group];
      if (!groupColor) continue;
      ret.push({
        times: trials[j].times,
        values: trials[j].roiValues || [],
        color: groupColor,
      });
    }
    return ret;
  }, [trials, groups]);
  // One mean/std curve overall, or one per group when perGroupStats is set.
  const averageCurves: AverageCurve[] = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i < 200; i++) {
      times.push(
        windowRange.start + ((windowRange.end - windowRange.start) * i) / 200,
      );
    }
    if (!perGroupStats) {
      const { values, stds } = computeMeanStd(plots, times);
      return [{ color: "black", times, values, stds }];
    }
    // Group the traces by color (each group has a distinct color).
    const byColor = new Map<string, { times: number[]; values: number[] }[]>();
    for (const p of plots) {
      const arr = byColor.get(p.color);
      if (arr) arr.push(p);
      else byColor.set(p.color, [p]);
    }
    const curves: AverageCurve[] = [];
    for (const [color, groupPlots] of byColor.entries()) {
      const { values, stds } = computeMeanStd(groupPlots, times);
      curves.push({ color, times, values, stds });
    }
    return curves;
  }, [plots, windowRange, perGroupStats]);
  return (
    <PlotChild
      width={width}
      height={height}
      plots={plots}
      averageCurves={averageCurves}
      windowRange={windowRange}
      maxNumRois={50}
      showRawTraces={showRawTraces}
      rawTraceAlpha={rawTraceAlpha}
      showStdBand={showStdBand}
      stdMultiple={stdMultiple}
      yAxisLabel={yAxisLabel}
      perGroupStats={perGroupStats}
    />
  );
};

type PlotChildProps = {
  width: number;
  height: number;
  plots: { times: number[]; values: number[]; color: string }[];
  averageCurves: AverageCurve[];
  windowRange: { start: number; end: number };
  maxNumRois: number;
  showRawTraces: boolean;
  rawTraceAlpha: number;
  showStdBand: boolean;
  stdMultiple: number;
  yAxisLabel: string;
  perGroupStats: boolean;
};

const PlotChild: FunctionComponent<PlotChildProps> = ({
  width,
  height,
  plots,
  averageCurves,
  windowRange,
  maxNumRois,
  showRawTraces,
  rawTraceAlpha,
  showStdBand,
  stdMultiple,
  yAxisLabel,
  perGroupStats,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >(undefined);
  const margins = useMemo(
    () => ({ left: 50, right: 20, top: 40, bottom: 40 }),
    [],
  );
  const { minValue, maxValue } = useMemo(() => {
    // percentiles
    const allValues: number[] = [];
    plots.forEach((p) => {
      allValues.push(...p.values);
    });
    const sortedValues = allValues
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);
    let minValue = sortedValues[Math.floor(sortedValues.length * 0.005)];
    let maxValue = sortedValues[Math.floor(sortedValues.length * 0.995)];
    // Make sure the std band fits within the displayed range.
    if (showStdBand) {
      for (const curve of averageCurves) {
        for (let i = 0; i < curve.values.length; i++) {
          const m = curve.values[i];
          const s = curve.stds[i];
          if (isNaN(m) || isNaN(s)) continue;
          const lo = m - stdMultiple * s;
          const hi = m + stdMultiple * s;
          if (isNaN(minValue) || lo < minValue) minValue = lo;
          if (isNaN(maxValue) || hi > maxValue) maxValue = hi;
        }
      }
    }
    if (!isFinite(minValue) || !isFinite(maxValue)) {
      minValue = 0;
      maxValue = 1;
    }
    if (minValue === maxValue) {
      maxValue = minValue + 1;
    }
    return { minValue, maxValue };
  }, [plots, showStdBand, stdMultiple, averageCurves]);
  const coordToPixel = useMemo(
    () => (t: number, v: number) => {
      const x =
        margins.left +
        ((t - windowRange.start) / (windowRange.end - windowRange.start)) *
          (width - margins.left - margins.right);
      const y =
        height -
        margins.bottom -
        ((v - minValue) / (maxValue - minValue)) *
          (height - margins.top - margins.bottom);
      return { x, y };
    },
    [width, height, windowRange, minValue, maxValue, margins],
  );
  const ticks = useMemo(
    () =>
      getTicks(minValue, maxValue, height - margins.top - margins.bottom, 80),
    [minValue, maxValue, height, margins],
  );
  const plotsSampled = useMemo(
    () => samplePlots(plots, maxNumRois),
    [plots, maxNumRois],
  );
  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    ctx.font = "12px sans-serif";

    // plots
    if (showRawTraces) {
      ctx.globalAlpha = rawTraceAlpha;
      plotsSampled.forEach((p) => {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        if (p.values.length === 0) return;
        const p0 = coordToPixel(windowRange.start, p.values[0]);
        ctx.moveTo(p0.x, p0.y);
        for (let i = 1; i < p.values.length; i++) {
          const t = p.times[i];
          const v = p.values[i];
          const p1 = coordToPixel(t, v);
          ctx.lineTo(p1.x, p1.y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
    }
    // mean curve(s): one black line overall, or one per group in its color.
    const meanLineWidth = perGroupStats ? 3 : 4;
    for (const curve of averageCurves) {
      ctx.strokeStyle = curve.color;
      ctx.lineWidth = meanLineWidth;
      ctx.beginPath();
      let active = false;
      for (let i = 0; i < curve.values.length; i++) {
        const t = curve.times[i];
        const v = curve.values[i];
        if (isNaN(v)) {
          active = false;
          continue;
        }
        const p1 = coordToPixel(t, v);
        if (!active) {
          ctx.moveTo(p1.x, p1.y);
          active = true;
        } else {
          ctx.lineTo(p1.x, p1.y);
        }
      }
      ctx.stroke();
    }

    // mean +/- N*std as dashed lines (per curve, in the curve's color)
    if (showStdBand) {
      const drawBand = (curve: AverageCurve, sign: number) => {
        ctx.beginPath();
        let bandActive = false;
        for (let i = 0; i < curve.values.length; i++) {
          const t = curve.times[i];
          const m = curve.values[i];
          const s = curve.stds[i];
          if (isNaN(m) || isNaN(s)) {
            bandActive = false;
            continue;
          }
          const p1 = coordToPixel(t, m + sign * stdMultiple * s);
          if (!bandActive) {
            ctx.moveTo(p1.x, p1.y);
            bandActive = true;
          } else {
            ctx.lineTo(p1.x, p1.y);
          }
        }
        ctx.stroke();
      };
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      for (const curve of averageCurves) {
        ctx.strokeStyle = perGroupStats ? curve.color : "#333";
        drawBand(curve, 1);
        drawBand(curve, -1);
      }
      ctx.restore();
    }

    // y axis
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top);
    ctx.lineTo(margins.left, height - margins.bottom);
    ctx.stroke();

    // y axis label
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.save();
    const x0 = margins.left - 25;
    const y0 = margins.top + (height - margins.top - margins.bottom) / 2;
    ctx.translate(x0, y0);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // draw y axis ticks
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ticks.forEach((tick) => {
      const p0 = coordToPixel(windowRange.start, tick.value);
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p0.x - 5, p0.y);
      ctx.stroke();
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(tick.value + "", p0.x - 6, p0.y);
    });

    // x axis labels
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const p00 = coordToPixel(0, minValue);
    ctx.fillText("0", p00.x, p00.y + 4);
    ctx.fillText(
      windowRange.start.toString(),
      margins.left,
      height - margins.bottom + 4,
    );
    ctx.fillText(
      windowRange.end.toString(),
      width - margins.right,
      height - margins.bottom + 4,
    );
    const labelText = "Time offset (s)";
    ctx.fillText(
      labelText,
      margins.left + (width - margins.left - margins.right) / 2,
      height - margins.bottom + 20,
    );

    // x axis
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, height - margins.bottom);
    ctx.lineTo(width - margins.right, height - margins.bottom);
    ctx.stroke();

    // vertical line at zero
    ctx.strokeStyle = "lightgray";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const p1 = coordToPixel(0, minValue);
    const p2 = coordToPixel(0, maxValue);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // vertical line at zero
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.beginPath();
    const p001 = coordToPixel(0, minValue);
    const p002 = coordToPixel(0, maxValue);
    ctx.moveTo(p001.x, p001.y);
    ctx.lineTo(p002.x, p002.y);
    ctx.stroke();
  }, [
    canvasElement,
    width,
    height,
    plotsSampled,
    windowRange,
    minValue,
    maxValue,
    margins,
    coordToPixel,
    ticks,
    averageCurves,
    showRawTraces,
    rawTraceAlpha,
    showStdBand,
    stdMultiple,
    yAxisLabel,
    perGroupStats,
  ]);

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <canvas
        ref={(elmt) => elmt && setCanvasElement(elmt)}
        width={width}
        height={height}
      />
    </div>
  );
};

const interpolateOntoGrid = (
  times: number[],
  values: number[],
  grid: number[],
) => {
  const ret: number[] = [];
  let i = 0;
  for (let j = 0; j < grid.length; j++) {
    while (i < times.length && times[i] < grid[j]) {
      i += 1;
    }
    if (i === 0) {
      ret.push(NaN);
    } else if (i === times.length) {
      ret.push(NaN);
    } else {
      const t0 = times[i - 1];
      const t1 = times[i];
      const v0 = values[i - 1];
      const v1 = values[i];
      ret.push(v0 + ((v1 - v0) * (grid[j] - t0)) / (t1 - t0));
    }
  }
  return ret;
};

const samplePlots = (
  plots: { times: number[]; values: number[]; color: string }[],
  maxNumRois: number,
) => {
  if (plots.length <= maxNumRois) return plots;
  const ret: { times: number[]; values: number[]; color: string }[] = [];
  const step = Math.ceil(plots.length / maxNumRois);
  for (let i = 0; i < plots.length; i += step) {
    ret.push(plots[i]);
  }
  return ret;
};

export default TrialAlignedSeriesWidget;
