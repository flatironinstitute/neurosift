/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";

type PSTHWidgetProps = {
  width: number;
  height: number;
  trials: { times: number[]; group: any }[];
  groups: { group: any; color: string }[];
  windowRange: { start: number; end: number };
  alignmentVariableName: string;
  showXAxisLabels: boolean;
};

const PSTHRasterWidget: FunctionComponent<PSTHWidgetProps> = ({
  width,
  height,
  trials,
  groups,
  windowRange,
  alignmentVariableName,
  showXAxisLabels,
}) => {
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(
    null,
  );

  const margins = useMemo(
    () => ({
      left: 50,
      right: 20,
      top: 20,
      bottom: showXAxisLabels ? 40 : 10,
    }),
    [showXAxisLabels],
  );

  const coordToPixel = useMemo(
    () => (t: number, iTrial: number) => {
      const x =
        margins.left +
        ((t - windowRange.start) / (windowRange.end - windowRange.start)) *
          (width - margins.left - margins.right);
      const y =
        margins.top +
        (iTrial / trials.length) * (height - margins.top - margins.bottom);
      return { x, y };
    },
    [windowRange, width, height, trials.length, margins],
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
    const yAxisLabel = "Trial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.save();
    const x0 = margins.left - 6;
    const y0 = margins.top + (height - margins.top - margins.bottom) / 2;
    ctx.translate(x0, y0);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(yAxisLabel, 0, 0);
    ctx.restore();

    // x axis labels
    if (showXAxisLabels) {
      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("0", p2.x, p2.y + 4);
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
    }

    // x axis
    ctx.strokeStyle = "gray";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margins.left, height - margins.bottom);
    ctx.lineTo(width - margins.right, height - margins.bottom);
    ctx.stroke();

    const colorsByGroup: { [key: number | string]: string } = {};
    for (const g of groups) {
      colorsByGroup[g.group] = g.color;
    }

    // trials
    trials.forEach((trial, iTrial) => {
      const groupColor = colorsByGroup[trial.group];
      if (!groupColor) return;
      ctx.fillStyle = groupColor;
      for (let i = 0; i < trial.times.length; i++) {
        const p = coordToPixel(trial.times[i], iTrial);
        ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
    });
  }, [
    canvasElement,
    trials,
    coordToPixel,
    windowRange,
    width,
    height,
    margins,
    alignmentVariableName,
    groups,
    showXAxisLabels,
  ]);

  return (
    <canvas
      ref={(elmt) => setCanvasElement(elmt)}
      width={width}
      height={height}
    />
  );
};

export default PSTHRasterWidget;
