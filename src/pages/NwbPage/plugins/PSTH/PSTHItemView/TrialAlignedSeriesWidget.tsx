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
};

const TrialAlignedSeriesWidget: FunctionComponent<
  TrialAlignedSeriesWidgetProps
> = ({ width, height, trials, groups, windowRange }) => {
  const plots: { times: number[]; values: number[]; color: string }[] =
    useMemo(() => {
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
  const averagePlot: { times: number[]; values: number[] } = useMemo(() => {
    const times: number[] = [];
    for (let i = 0; i < 200; i++) {
      times.push(
        windowRange.start + ((windowRange.end - windowRange.start) * i) / 200,
      );
    }
    const valueSums = new Array(200).fill(0);
    const valueCounts = new Array(200).fill(0);
    for (const plot of plots) {
      const values = interpolateOntoGrid(plot.times, plot.values, times);
      for (let i = 0; i < 200; i++) {
        if (!isNaN(values[i])) {
          valueSums[i] += values[i];
          valueCounts[i] += 1;
        }
      }
    }
    const values: number[] = [];
    for (let i = 0; i < 200; i++) {
      if (valueCounts[i] !== 0) {
        values.push(valueSums[i] / valueCounts[i]);
      } else {
        values.push(NaN);
      }
    }
    return { times, values };
  }, [plots, windowRange]);
  return (
    <PlotChild
      width={width}
      height={height}
      plots={plots}
      averagePlot={averagePlot}
      windowRange={windowRange}
      maxNumRois={50}
    />
  );
};

type PlotChildProps = {
  width: number;
  height: number;
  plots: { times: number[]; values: number[]; color: string }[];
  averagePlot: { times: number[]; values: number[] };
  windowRange: { start: number; end: number };
  maxNumRois: number;
};

const PlotChild: FunctionComponent<PlotChildProps> = ({
  width,
  height,
  plots,
  averagePlot,
  windowRange,
  maxNumRois,
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
    const minValue = sortedValues[Math.floor(sortedValues.length * 0.005)];
    const maxValue = sortedValues[Math.floor(sortedValues.length * 0.995)];
    return { minValue, maxValue };
  }, [plots]);
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
    //average plot
    ctx.strokeStyle = "black";
    ctx.lineWidth = 4;
    ctx.beginPath();
    let active = false;
    for (let i = 0; i < averagePlot.values.length; i++) {
      const t = averagePlot.times[i];
      const v = averagePlot.values[i];
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

    // y axis
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top);
    ctx.lineTo(margins.left, height - margins.bottom);
    ctx.stroke();

    // y axis label
    const yAxisLabel = "ROI";
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
    averagePlot,
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
