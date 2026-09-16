import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import { applyColormap, ColormapName } from "./colormap";
import { plotMargins } from "./plotConstants";
import { NormalizationMode } from "./spectralConfig";
import { SpectrogramResult } from "./WorkerTypes";

type Props = {
  result: SpectrogramResult | null;
  width: number;
  height: number;
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  fMinHz: number;
  fMaxHz: number;
  logFreq: boolean;
  colormap: ColormapName;
  normalization: NormalizationMode;
  baselineWindowSec: [number, number] | null;
  // Effective color limits (dB, or normalized units) if provided; otherwise the
  // widget auto-scales and reports the range through onAutoLimits.
  colorMinDb: number | null;
  colorMaxDb: number | null;
  useManualLimits: boolean;
  autoPercentile: number;
  symmetric: boolean; // symmetric limits (baseline/z-score diverging)
  onAutoLimits?: (lo: number, hi: number) => void;
  smoothingBoxHz?: number | null; // 2W bar
  nyquistHz: number;
  highPassHz: number | null;
  lowPassHz: number | null;
  loading?: boolean;
};

const margins = plotMargins;
const GAP_RGB: [number, number, number] = [70, 70, 76];

const percentile = (sorted: Float64Array, p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((p / 100) * (sorted.length - 1))),
  );
  return sorted[idx];
};

const SpectrogramWidget: FunctionComponent<Props> = ({
  result,
  width,
  height,
  visibleStartTimeSec,
  visibleEndTimeSec,
  fMinHz,
  fMaxHz,
  logFreq,
  colormap,
  normalization,
  baselineWindowSec,
  colorMinDb,
  colorMaxDb,
  useManualLimits,
  autoPercentile,
  symmetric,
  onAutoLimits,
  smoothingBoxHz,
  nyquistHz,
  highPassHz,
  lowPassHz,
  loading,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const plotW = width - margins.left - margins.right;
  const plotH = height - margins.top - margins.bottom;

  // Per-frequency-bin normalization transform: disp = (db - offset) * scale.
  const norm = useMemo(() => {
    if (!result || result.numWindows === 0) return null;
    const { numWindows, numFreqs, powers, freqStepHz, gaps } = result;
    const offset = new Float64Array(numFreqs);
    const scale = new Float64Array(numFreqs).fill(1);
    const valid = new Uint8Array(numFreqs).fill(1);

    if (normalization === "whiten") {
      for (let f = 0; f < numFreqs; f++) {
        const freq = f * freqStepHz;
        if (freq > 0) offset[f] = -10 * Math.log10(freq);
        else valid[f] = 0;
      }
    } else if (normalization === "zscore") {
      for (let f = 0; f < numFreqs; f++) {
        let sum = 0;
        let n = 0;
        for (let w = 0; w < numWindows; w++) {
          if (gaps[w]) continue;
          const v = powers[w * numFreqs + f];
          if (Number.isFinite(v)) {
            sum += v;
            n++;
          }
        }
        const mean = n > 0 ? sum / n : 0;
        let varSum = 0;
        for (let w = 0; w < numWindows; w++) {
          if (gaps[w]) continue;
          const v = powers[w * numFreqs + f];
          if (Number.isFinite(v)) varSum += (v - mean) * (v - mean);
        }
        const std = n > 1 ? Math.sqrt(varSum / n) : 0;
        offset[f] = mean;
        scale[f] = std > 0 ? 1 / std : 0;
      }
    } else if (normalization === "baseline") {
      // Mean dB over columns whose center time falls in the baseline window;
      // if none are in this block, fall back to the block mean per frequency.
      const t0 = baselineWindowSec ? baselineWindowSec[0] : -Infinity;
      const t1 = baselineWindowSec ? baselineWindowSec[1] : Infinity;
      for (let f = 0; f < numFreqs; f++) {
        let sum = 0;
        let n = 0;
        for (let w = 0; w < numWindows; w++) {
          if (gaps[w]) continue;
          const tc = result.firstWindowCenterTimeSec + w * result.windowStepSec;
          if (tc < t0 || tc > t1) continue;
          const v = powers[w * numFreqs + f];
          if (Number.isFinite(v)) {
            sum += v;
            n++;
          }
        }
        if (n === 0) {
          for (let w = 0; w < numWindows; w++) {
            if (gaps[w]) continue;
            const v = powers[w * numFreqs + f];
            if (Number.isFinite(v)) {
              sum += v;
              n++;
            }
          }
        }
        offset[f] = n > 0 ? sum / n : 0;
      }
    }
    return { offset, scale, valid };
  }, [result, normalization, baselineWindowSec]);

  // Auto color limits over displayed, in-band values.
  const autoLimits = useMemo(() => {
    if (!result || result.numWindows === 0 || !norm) return { lo: 0, hi: 1 };
    const { numWindows, numFreqs, powers, freqStepHz, gaps } = result;
    const fLo = Math.max(0, fMinHz);
    const fHi = Math.min(nyquistHz, fMaxHz);
    const vals: number[] = [];
    for (let f = 0; f < numFreqs; f++) {
      if (!norm.valid[f]) continue;
      const freq = f * freqStepHz;
      if (freq < fLo || freq > fHi) continue;
      for (let w = 0; w < numWindows; w++) {
        if (gaps[w]) continue;
        const raw = powers[w * numFreqs + f];
        if (!Number.isFinite(raw)) continue;
        vals.push((raw - norm.offset[f]) * norm.scale[f]);
      }
    }
    if (vals.length === 0) return { lo: 0, hi: 1 };
    const sorted = Float64Array.from(vals).sort();
    let lo = percentile(sorted, autoPercentile);
    let hi = percentile(sorted, 100 - autoPercentile);
    if (symmetric) {
      const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1;
      lo = -m;
      hi = m;
    }
    if (hi <= lo) hi = lo + 1;
    return { lo, hi };
  }, [result, norm, fMinHz, fMaxHz, nyquistHz, autoPercentile, symmetric]);

  useEffect(() => {
    if (onAutoLimits) onAutoLimits(autoLimits.lo, autoLimits.hi);
  }, [autoLimits, onAutoLimits]);

  const vMin =
    useManualLimits && colorMinDb != null ? colorMinDb : autoLimits.lo;
  const vMax =
    useManualLimits && colorMaxDb != null ? colorMaxDb : autoLimits.hi;

  // Row->frequency map for the display (log or linear), then a display-space
  // bitmap (numWindows x plotH) so pan/zoom is just a horizontal drawImage.
  const bitmap = useMemo(() => {
    if (!result || result.numWindows === 0 || !norm || plotH <= 0) return null;
    const { numWindows, numFreqs, powers, freqStepHz, gaps } = result;
    const rows = Math.max(1, Math.floor(plotH));
    const fLo = Math.max(logFreq ? Math.max(0.1, fMinHz) : 0, fMinHz);
    const fHi = Math.min(nyquistHz, fMaxHz);
    const rowBin = new Int32Array(rows).fill(-1);
    for (let r = 0; r < rows; r++) {
      const frac = rows > 1 ? r / (rows - 1) : 0; // 0 = top
      let freq: number;
      if (logFreq) {
        const lo = Math.log(Math.max(0.1, fLo));
        const hi = Math.log(Math.max(fLo + 1e-6, fHi));
        freq = Math.exp(hi - frac * (hi - lo));
      } else {
        freq = fHi - frac * (fHi - fLo);
      }
      const bin = Math.round(freq / freqStepHz);
      rowBin[r] = bin >= 0 && bin < numFreqs && norm.valid[bin] ? bin : -1;
    }

    const span = vMax - vMin || 1;
    const img = new ImageData(numWindows, rows);
    for (let w = 0; w < numWindows; w++) {
      const isGap = gaps[w];
      for (let r = 0; r < rows; r++) {
        let rr: number, gg: number, bb: number;
        const bin = rowBin[r];
        if (isGap) {
          [rr, gg, bb] = GAP_RGB;
        } else if (bin < 0) {
          rr = gg = bb = 255;
        } else {
          const raw = powers[w * numFreqs + bin];
          if (!Number.isFinite(raw)) {
            [rr, gg, bb] = GAP_RGB;
          } else {
            const v = (raw - norm.offset[bin]) * norm.scale[bin];
            [rr, gg, bb] = applyColormap(colormap, (v - vMin) / span);
          }
        }
        const idx = (r * numWindows + w) * 4;
        img.data[idx] = rr;
        img.data[idx + 1] = gg;
        img.data[idx + 2] = bb;
        img.data[idx + 3] = 255;
      }
    }
    const off = document.createElement("canvas");
    off.width = numWindows;
    off.height = rows;
    off.getContext("2d")?.putImageData(img, 0, 0);
    return off;
  }, [
    result,
    norm,
    plotH,
    fMinHz,
    fMaxHz,
    logFreq,
    nyquistHz,
    colormap,
    vMin,
    vMax,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (plotW <= 0 || plotH <= 0) return;

    const visSpan = visibleEndTimeSec - visibleStartTimeSec;
    const tToX = (t: number) =>
      margins.left + ((t - visibleStartTimeSec) / visSpan) * plotW;
    const fLo = Math.max(logFreq ? Math.max(0.1, fMinHz) : 0, fMinHz);
    const fHi = Math.min(nyquistHz, fMaxHz);
    const freqToY = (f: number) => {
      let frac: number;
      if (logFreq) {
        const lo = Math.log(Math.max(0.1, fLo));
        const hi = Math.log(Math.max(fLo + 1e-6, fHi));
        frac = (Math.log(Math.max(0.1, f)) - lo) / (hi - lo);
      } else {
        frac = (f - fLo) / (fHi - fLo);
      }
      return margins.top + plotH - frac * plotH;
    };

    if (bitmap && result && visSpan > 0) {
      const halfStep = result.windowStepSec / 2;
      const blockStart = result.firstWindowCenterTimeSec - halfStep;
      const blockEnd =
        result.firstWindowCenterTimeSec +
        (result.numWindows - 1) * result.windowStepSec +
        halfStep;
      ctx.save();
      ctx.beginPath();
      ctx.rect(margins.left, margins.top, plotW, plotH);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(
        bitmap,
        0,
        0,
        result.numWindows,
        bitmap.height,
        tToX(blockStart),
        margins.top,
        tToX(blockEnd) - tToX(blockStart),
        plotH,
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "#888";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(loading ? "Computing…" : "No data", width / 2, height / 2);
    }

    // Filter transition-band and anti-alias rolloff shading on the y-axis.
    ctx.save();
    ctx.beginPath();
    ctx.rect(margins.left, margins.top, plotW, plotH);
    ctx.clip();
    const shade = (fa: number, fb: number, color: string) => {
      const y0 = freqToY(Math.min(fb, fHi));
      const y1 = freqToY(Math.max(fa, fLo));
      ctx.fillStyle = color;
      ctx.fillRect(margins.left, Math.min(y0, y1), plotW, Math.abs(y1 - y0));
    };
    if (lowPassHz != null && lowPassHz < fHi) {
      shade(lowPassHz, Math.min(lowPassHz * 1.25, fHi), "rgba(200,60,60,0.16)");
    }
    if (highPassHz != null && highPassHz > fLo) {
      shade(
        Math.max(highPassHz * 0.8, fLo),
        highPassHz,
        "rgba(200,60,60,0.16)",
      );
    }
    const rolloff = nyquistHz * 0.85;
    if (rolloff < fHi) shade(rolloff, fHi, "rgba(120,120,120,0.14)");
    ctx.restore();

    // Axes frame
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    ctx.strokeRect(margins.left, margins.top, plotW, plotH);

    // Time axis (x)
    ctx.fillStyle = "#222";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i <= 6; i++) {
      const frac = i / 6;
      const x = margins.left + frac * plotW;
      const t = visibleStartTimeSec + frac * visSpan;
      ctx.strokeStyle = "#999";
      ctx.beginPath();
      ctx.moveTo(x, margins.top + plotH);
      ctx.lineTo(x, margins.top + plotH + 4);
      ctx.stroke();
      ctx.fillText(t.toFixed(2), x, margins.top + plotH + 6);
    }
    ctx.fillText("Time (s)", margins.left + plotW / 2, height - 12);

    // Frequency axis (y)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yticks = logFreq ? logTicks(fLo, fHi) : linTicks(fLo, fHi, 6);
    for (const f of yticks) {
      const y = freqToY(f);
      ctx.strokeStyle = "#999";
      ctx.beginPath();
      ctx.moveTo(margins.left - 4, y);
      ctx.lineTo(margins.left, y);
      ctx.stroke();
      ctx.fillStyle = "#222";
      ctx.fillText(
        f >= 100 ? f.toFixed(0) : f.toFixed(f < 10 ? 1 : 0),
        margins.left - 6,
        y,
      );
    }
    ctx.save();
    ctx.translate(13, margins.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Frequency (Hz)" + (logFreq ? " [log]" : ""), 0, 0);
    ctx.restore();

    // 2W smoothing bar near the left edge.
    if (smoothingBoxHz != null && smoothingBoxHz > 0 && result) {
      const fc = fLo + (fHi - fLo) * (logFreq ? 0.5 : 0.5);
      const yA = freqToY(Math.max(fLo, fc - smoothingBoxHz / 2));
      const yB = freqToY(Math.min(fHi, fc + smoothingBoxHz / 2));
      const barX = margins.left + 10;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(barX, yA);
      ctx.lineTo(barX, yB);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(barX - 3, yA);
      ctx.lineTo(barX + 3, yA);
      ctx.moveTo(barX - 3, yB);
      ctx.lineTo(barX + 3, yB);
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "10px sans-serif";
      ctx.fillText("2W", barX + 5, (yA + yB) / 2);
    }

    // Colorbar
    if (result && bitmap) {
      const barX = width - margins.right + 24;
      const barW = 14;
      const barTop = margins.top;
      const barH = plotH;
      const grad = ctx.createLinearGradient(0, barTop + barH, 0, barTop);
      for (let s = 0; s <= 10; s++) {
        const [r, g, b] = applyColormap(colormap, s / 10);
        grad.addColorStop(s / 10, `rgb(${r},${g},${b})`);
      }
      ctx.fillStyle = grad;
      ctx.fillRect(barX, barTop, barW, barH);
      ctx.strokeStyle = "#333";
      ctx.strokeRect(barX, barTop, barW, barH);
      ctx.fillStyle = "#222";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.font = "10px sans-serif";
      ctx.fillText(`${vMax.toFixed(1)}`, barX + barW + 4, barTop + 5);
      ctx.fillText(`${vMin.toFixed(1)}`, barX + barW + 4, barTop + barH - 5);
      ctx.save();
      ctx.translate(barX + barW + 34, barTop + barH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillText(colorbarLabel(normalization), 0, 0);
      ctx.restore();
    }
  }, [
    bitmap,
    result,
    width,
    height,
    plotW,
    plotH,
    visibleStartTimeSec,
    visibleEndTimeSec,
    fMinHz,
    fMaxHz,
    logFreq,
    nyquistHz,
    colormap,
    normalization,
    highPassHz,
    lowPassHz,
    smoothingBoxHz,
    vMin,
    vMax,
    loading,
  ]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};

const colorbarLabel = (n: NormalizationMode): string => {
  switch (n) {
    case "whiten":
      return "Power (dB, whitened)";
    case "zscore":
      return "z-score";
    case "baseline":
      return "dB vs baseline";
    default:
      return "Power (dB)";
  }
};

const linTicks = (lo: number, hi: number, n: number): number[] => {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push(lo + ((hi - lo) * i) / n);
  return out;
};

const logTicks = (lo: number, hi: number): number[] => {
  const out: number[] = [];
  const start = Math.max(0.1, lo);
  for (
    let dec = Math.floor(Math.log10(start));
    dec <= Math.ceil(Math.log10(hi));
    dec++
  ) {
    for (const m of [1, 2, 5]) {
      const f = m * Math.pow(10, dec);
      if (f >= start && f <= hi) out.push(f);
    }
  }
  return out;
};

export default SpectrogramWidget;
