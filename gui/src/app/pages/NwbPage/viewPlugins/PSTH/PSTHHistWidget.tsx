/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { getTicks } from "./getTicks";
import { PSTHPrefs } from "./PSTHItemView";

type PSTHWidgetProps = {
  width: number;
  height: number;
  trials: { times: number[]; group: any }[];
  groups: { group: any; color: string }[];
  windowRange: { start: number; end: number };
  alignmentVariableName: string;
  prefs: PSTHPrefs;
};

const smoothingUpsamplingFactor = 30;

const PSTHHistWidget: FunctionComponent<PSTHWidgetProps> = ({
  width,
  height,
  trials,
  groups,
  windowRange,
  alignmentVariableName,
  prefs,
}) => {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  const margins = useMemo(
    () => ({ left: 50, right: 20, top: 40, bottom: 40 }),
    [],
  );

  const numBins =
    prefs.numBins * (prefs.smoothedHist ? smoothingUpsamplingFactor : 1);

  const groupPlots = useMemo(() => {
    const t1 = windowRange.start;
    const t2 = windowRange.end;
    const binSize = (t2 - t1) / numBins;
    const binEdges = new Array(numBins + 1)
      .fill(0)
      .map((_, ii) => t1 + ii * binSize);
    const ret: {
      group: { group: any; color: string };
      firingRates: number[];
    }[] = [];
    groups.forEach((g) => {
      const trials2 = trials.filter((t) => t.group === g.group);
      if (trials2.length === 0) return;
      const timesForGroup = trials2.map((t) => t.times).flat();
      const binCounts: number[] = [];
      for (let i = 0; i < numBins; i++) {
        const t1 = binEdges[i];
        const t2 = binEdges[i + 1];
        const count = timesForGroup.filter((t) => t >= t1 && t < t2).length;
        binCounts.push(count);
      }
      ret.push({
        group: g,
        firingRates: binCounts.map((c) => c / trials2.length / binSize),
      });
    });
    if (prefs.smoothedHist) {
      ret.forEach((g) => {
        g.firingRates = applySmoothing(
          g.firingRates,
          smoothingUpsamplingFactor,
        );
      });
    }
    return ret;
  }, [trials, groups, windowRange, numBins, prefs.smoothedHist]);

  const maxFiringRate = useMemo(() => {
    let ret = 0;
    groupPlots.forEach((g) => {
      g.firingRates.forEach((r) => {
        if (r > ret) ret = r;
      });
    });
    return ret;
  }, [groupPlots]);

  const coordToPixel = useMemo(
    () => (t: number, firingRate: number) => {
      const x =
        margins.left +
        ((t - windowRange.start) / (windowRange.end - windowRange.start)) *
          (width - margins.left - margins.right);
      const y =
        height -
        margins.bottom -
        (firingRate / maxFiringRate) * (height - margins.top - margins.bottom);
      return { x, y };
    },
    [windowRange, width, height, maxFiringRate, margins],
  );

  const ticks = useMemo(
    () => getTicks(0, maxFiringRate, height - margins.top - margins.bottom, 80),
    [maxFiringRate, height, margins],
  );

  useEffect(() => {
    if (!canvasElement) return;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // vertical line at zero
    ctx.strokeStyle = "lightgray";
    ctx.lineWidth = 3;
    ctx.beginPath();
    const p1 = coordToPixel(0, 0);
    const p2 = coordToPixel(0, trials.length);
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.font = "12px sans-serif";

    // y axis
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, margins.top);
    ctx.lineTo(margins.left, height - margins.bottom);
    ctx.stroke();

    // y axis label
    const yAxisLabel = "Firing rate (Hz)";
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
    ctx.fillText("0", p1.x, p1.y + 4);
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

    // plots
    groupPlots.forEach((g) => {
      ctx.strokeStyle = g.group.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const p0 = coordToPixel(windowRange.start, g.firingRates[0]);
      ctx.moveTo(p0.x, p0.y);
      g.firingRates.forEach((r, i) => {
        const t1 =
          windowRange.start +
          (i * (windowRange.end - windowRange.start)) / g.firingRates.length;
        const t2 =
          windowRange.start +
          ((i + 1) * (windowRange.end - windowRange.start)) /
            g.firingRates.length;
        const p1 = coordToPixel(t1, r);
        const p2 = coordToPixel(t2, r);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
      });
      ctx.stroke();
    });
  }, [
    canvasElement,
    width,
    height,
    trials,
    groups,
    windowRange,
    alignmentVariableName,
    groupPlots,
    coordToPixel,
    margins,
    ticks,
  ]);

  return (
    <canvas
      ref={(elmt) => setCanvasElement(elmt)}
      width={width}
      height={height}
    />
  );
};

const applySmoothing = (x: number[], upsamplingFactor: number) => {
  const numer = new Array(x.length).fill(0);
  const denom = new Array(x.length).fill(0);
  const sigma = upsamplingFactor / 2;
  for (let i = 0; i < x.length; i++) {
    for (let j = -upsamplingFactor * 3; j <= upsamplingFactor * 3; j++) {
      const ii = i + j;
      if (ii >= 0 && ii < x.length) {
        const w = Math.exp((-j * j) / (2 * sigma * sigma));
        numer[ii] += w * x[i];
        denom[ii] += w;
      }
    }
  }
  const ret = new Array(x.length).fill(0);
  for (let i = 0; i < x.length; i++) {
    ret[i] = numer[i] / denom[i];
  }
  return ret;
};

export default PSTHHistWidget;
