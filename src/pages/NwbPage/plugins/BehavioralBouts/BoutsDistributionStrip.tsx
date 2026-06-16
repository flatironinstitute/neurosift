import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import {
  Bout,
  BoutLabel,
  drawObservedTrack,
  formatTime,
  ObservationInterval,
} from "./behavioralBoutsUtils";

type Props = {
  width: number;
  height: number;
  // Lanes, in display order (the selector's order so colors match the list).
  labels: BoutLabel[];
  // Bouts to draw (already min-bout filtered by the parent).
  bouts: Bout[];
  domStart: number;
  domEnd: number;
  selectedLabelId: number | null;
  onSelectLabel?: (labelId: number) => void;
  // observation_intervals; drawn as a near-black "observed" coverage track in a
  // dedicated bottom lane when present (shared grammar with the bottom timeline).
  observed?: ObservationInterval[] | null;
  // Fade non-selected lanes so the selected one stands out (the sidebar inset);
  // when false, every lane is full color (the full-screen view).
  fade?: boolean;
  // Show a bottom time axis (used when the strip is the whole view, e.g. mlost).
  showAxis?: boolean;
};

const FADED_ALPHA = 0.4;
// The "observed" coverage track (one extra bottom lane) when observed is present.
const TRACK_H = 9;
const TRACK_GAP = 2;

const AXIS_H = 18;
const TOP = 2;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// A compact multi-row "lay of the land": one colored lane per behavior, every
// (filtered) bout drawn in its behavior's color, so you see how all behaviors are
// distributed across the session at a glance. No labels (the selector buttons
// carry the names by color); the selected lane is highlighted.
const BoutsDistributionStrip: FunctionComponent<Props> = ({
  width,
  height,
  labels,
  bouts,
  domStart,
  domEnd,
  selectedLabelId,
  onSelectLabel,
  observed,
  fade,
  showAxis,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const nRows = labels.length || 1;
  const axisH = showAxis ? AXIS_H : 0;
  const hasObs = !!(observed && observed.length);
  const trackBlock = hasObs ? TRACK_H + TRACK_GAP : 0;
  const rowsAreaH = Math.max(8, height - TOP - axisH - trackBlock);
  const rowHeight = clamp(rowsAreaH / nRows, 2, 18);

  const idToRow = useMemo(() => {
    const m = new Map<number, number>();
    labels.forEach((l, i) => m.set(l.labelId, i));
    return m;
  }, [labels]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const span = domEnd - domStart;
    const timeToX = (t: number) => ((t - domStart) / span) * width;
    const rowsBottom = TOP + nRows * rowHeight;
    const axisY = rowsBottom + trackBlock;

    // Lanes: non-selected faded (when `fade`), selected full color.
    for (const b of bouts) {
      const row = idToRow.get(b.labelId);
      if (row === undefined) continue;
      const x1 = timeToX(b.startTime);
      const x2 = timeToX(b.stopTime);
      if (x2 < 0 || x1 > width) continue;
      const x = Math.max(0, x1);
      const w = Math.max(1, Math.min(width, x2) - x);
      ctx.globalAlpha = fade && b.labelId !== selectedLabelId ? FADED_ALPHA : 1;
      ctx.fillStyle = labels[row].color;
      ctx.fillRect(x, TOP + row * rowHeight, w, Math.max(1, rowHeight - 1));
    }
    ctx.globalAlpha = 1;

    // Observed (scored) coverage as a dedicated bottom lane (its own line, so the
    // behavior lanes above stay on a clean backdrop). Only when present.
    if (hasObs) {
      drawObservedTrack(
        ctx,
        observed!,
        timeToX,
        width,
        rowsBottom + TRACK_GAP,
        TRACK_H,
      );
    }

    if (showAxis) {
      ctx.fillStyle = "#777";
      ctx.strokeStyle = "rgba(0,0,0,0.2)";
      ctx.font = "10px sans-serif";
      ctx.textBaseline = "top";
      const nTicks = Math.max(2, Math.floor(width / 110));
      for (let i = 0; i <= nTicks; i++) {
        const frac = i / nTicks;
        const x = clamp(frac * width, 0, width - 1);
        ctx.beginPath();
        ctx.moveTo(x + 0.5, axisY);
        ctx.lineTo(x + 0.5, axisY + 4);
        ctx.stroke();
        ctx.textAlign = i === 0 ? "left" : i === nTicks ? "right" : "center";
        ctx.fillText(formatTime(domStart + frac * span), x, axisY + 5);
      }
    }
  }, [
    labels,
    bouts,
    domStart,
    domEnd,
    width,
    height,
    nRows,
    rowHeight,
    idToRow,
    selectedLabelId,
    observed,
    hasObs,
    trackBlock,
    fade,
    showAxis,
  ]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSelectLabel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const row = Math.floor((e.clientY - rect.top - TOP) / rowHeight);
    if (row >= 0 && row < labels.length) onSelectLabel(labels[row].labelId);
  };

  return (
    <div
      style={{ position: "relative", width, height }}
      onClick={onClick}
      title={onSelectLabel ? "Click a lane to select that behavior" : undefined}
    >
      <canvas
        ref={canvasRef}
        data-testid="bouts-distribution-canvas"
        style={{ display: "block" }}
      />
    </div>
  );
};

export default BoutsDistributionStrip;
