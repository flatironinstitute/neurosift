import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { Bout, BoutLabel, ClipMark, formatTime } from "./behavioralBoutsUtils";

type Props = {
  width: number;
  height: number;
  labels: BoutLabel[];
  bouts: Bout[];
  domStart: number;
  domEnd: number;
  selectedLabelId: number | null;
  // The bouts currently shown as montage clips (drawn full color + lettered).
  clipMarks?: ClipMark[];
};

const AXIS_H = 22;
const TOP = 4;
const PAD_LEFT = 8;
// Selected behavior's non-sampled bouts (shown faded, mirroring the VAME raster).
const NONCLIP_ALPHA = 0.35;
const OTHER_GREY = "#e8e8e8";

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// The bottom timeline, single row, focused on the selected behavior (same three
// tiers as the VAME EthogramRaster): every other behavior greyed for context, the
// selected behavior's bouts in its color, and the bouts actually sampled into the
// montage drawn at full opacity with their A/B/C letters while the selected
// behavior's other bouts are faded. Shows where the montage clips come from.
const BoutsTimeline: FunctionComponent<Props> = ({
  width,
  height,
  labels,
  bouts,
  domStart,
  domEnd,
  selectedLabelId,
  clipMarks,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const plotW = Math.max(40, width - PAD_LEFT * 2);
  const rowH = Math.max(10, height - AXIS_H - TOP);

  const selectedColor =
    (selectedLabelId !== null &&
      labels.find((l) => l.labelId === selectedLabelId)?.color) ||
    "#2c5aa0";

  // Start times of the sampled (montage) bouts, for the full-opacity tier.
  const clipStarts = useMemo(
    () => new Set((clipMarks || []).map((m) => m.startTime)),
    [clipMarks],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(plotW * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${plotW}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, plotW, height);

    const span = domEnd - domStart;
    const timeToX = (t: number) => ((t - domStart) / span) * plotW;
    const rowBottom = TOP + rowH;
    const rectFor = (b: Bout) => {
      const x1 = timeToX(b.startTime);
      const x2 = timeToX(b.stopTime);
      if (x2 < 0 || x1 > plotW) return null;
      const x = Math.max(0, x1);
      return [x, Math.max(1, Math.min(plotW, x2) - x)] as const;
    };

    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, TOP, plotW, rowH);

    // Tier 1: every other behavior, greyed for context.
    ctx.fillStyle = OTHER_GREY;
    for (const b of bouts) {
      if (b.labelId === selectedLabelId) continue;
      const r = rectFor(b);
      if (r) ctx.fillRect(r[0], TOP, r[1], rowH);
    }

    if (selectedLabelId !== null) {
      // Tier 2: the selected behavior's non-sampled bouts, faded.
      ctx.globalAlpha = NONCLIP_ALPHA;
      ctx.fillStyle = selectedColor;
      for (const b of bouts) {
        if (b.labelId !== selectedLabelId || clipStarts.has(b.startTime))
          continue;
        const r = rectFor(b);
        if (r) ctx.fillRect(r[0], TOP, r[1], rowH);
      }
      // Tier 3: the sampled (montage) bouts, full opacity.
      ctx.globalAlpha = 1;
      for (const b of bouts) {
        if (b.labelId !== selectedLabelId || !clipStarts.has(b.startTime))
          continue;
        const r = rectFor(b);
        if (r) ctx.fillRect(r[0], TOP, r[1], rowH);
      }
    }

    // Letters on the sampled bouts.
    if (clipMarks && selectedLabelId !== null) {
      const cy = TOP + rowH / 2;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.font = "bold 12px sans-serif";
      for (const m of clipMarks) {
        if (m.labelId !== selectedLabelId) continue;
        const x = clamp(timeToX(m.startTime), 0, plotW);
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff";
        ctx.strokeText(m.letter, x, cy);
        ctx.fillStyle = "#000";
        ctx.fillText(m.letter, x, cy);
      }
    }

    // Border + time axis.
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, TOP + 0.5, plotW - 1, rowH - 1);
    ctx.fillStyle = "#555";
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "top";
    const nTicks = Math.max(2, Math.floor(plotW / 110));
    for (let i = 0; i <= nTicks; i++) {
      const frac = i / nTicks;
      const x = clamp(frac * plotW, 0, plotW - 1);
      ctx.beginPath();
      ctx.moveTo(x + 0.5, rowBottom);
      ctx.lineTo(x + 0.5, rowBottom + 5);
      ctx.stroke();
      ctx.textAlign = i === 0 ? "left" : i === nTicks ? "right" : "center";
      ctx.fillText(formatTime(domStart + frac * span), x, rowBottom + 7);
    }
  }, [
    labels,
    bouts,
    domStart,
    domEnd,
    plotW,
    height,
    rowH,
    selectedLabelId,
    selectedColor,
    clipStarts,
    clipMarks,
  ]);

  return (
    <div
      data-testid="bouts-timeline"
      style={{ position: "relative", width, height, paddingLeft: PAD_LEFT }}
    >
      <canvas
        ref={canvasRef}
        data-testid="bouts-timeline-canvas"
        style={{ display: "block" }}
      />
    </div>
  );
};

export default BoutsTimeline;
