import {
  effectiveSamplingFrequency,
  halfBandwidthHz,
  maxLegalK,
  SpectralConfig,
} from "./spectralConfig";

export type DerivedReadouts = {
  effectiveFs: number;
  nyquistHz: number;
  windowDurationSec: number;
  timeResolutionSec: number;
  isMultitaper: boolean;
  halfBandwidthHz: number | null; // W = NW / T
  smoothingBoxHz: number | null; // 2W
  effectiveK: number; // clamped to maxK
  maxK: number; // 2*NW - 1
  requestedK: number;
  dof: number | null; // ~ 2K
};

export const computeDerived = (
  config: SpectralConfig,
  fsNative: number,
): DerivedReadouts => {
  const effectiveFs = effectiveSamplingFrequency(
    fsNative,
    config.decimationFactor,
  );
  const nyquistHz = effectiveFs / 2;
  const windowDurationSec =
    effectiveFs > 0 ? config.windowSizeSamples / effectiveFs : 0;
  const isMultitaper = config.taper === "multitaper";
  const maxK = maxLegalK(config.nw);
  const effectiveK = Math.max(1, Math.min(config.k, maxK));
  const W = isMultitaper ? halfBandwidthHz(config.nw, windowDurationSec) : null;

  return {
    effectiveFs,
    nyquistHz,
    windowDurationSec,
    timeResolutionSec: windowDurationSec,
    isMultitaper,
    halfBandwidthHz: W,
    smoothingBoxHz: W != null ? 2 * W : null,
    effectiveK,
    maxK,
    requestedK: config.k,
    dof: isMultitaper ? 2 * effectiveK : null,
  };
};

export type Warning = { severity: "warn" | "info"; text: string };

// Guardrail warnings surfaced live next to the controls.
export const computeWarnings = (
  config: SpectralConfig,
  d: DerivedReadouts,
): Warning[] => {
  const out: Warning[] = [];
  const viewSpan = Math.max(0, config.fMaxHz - config.fMinHz);

  if (config.lowPassHz != null && config.fMaxHz > config.lowPassHz) {
    out.push({
      severity: "warn",
      text: `Display fmax (${config.fMaxHz.toFixed(0)} Hz) is above the low-pass cutoff (${config.lowPassHz.toFixed(0)} Hz): the top of the plot is filter rolloff, not signal.`,
    });
  }
  if (config.highPassHz != null && config.fMinHz < config.highPassHz) {
    out.push({
      severity: "info",
      text: `Display fmin is below the high-pass cutoff (${config.highPassHz.toFixed(0)} Hz): the bottom of the plot is filter rolloff.`,
    });
  }

  if (config.k > d.maxK) {
    out.push({
      severity: "warn",
      text: `K=${config.k} exceeds the legal maximum 2·NW−1=${d.maxK} for NW=${config.nw}; clamped to ${d.effectiveK}.`,
    });
  }

  if (d.smoothingBoxHz != null && viewSpan > 0) {
    if (d.smoothingBoxHz >= viewSpan) {
      out.push({
        severity: "warn",
        text: `Smoothing 2W=${d.smoothingBoxHz.toFixed(1)} Hz is as wide as or wider than the viewed range (${viewSpan.toFixed(1)} Hz): structure will be washed out.`,
      });
    } else if (d.smoothingBoxHz >= viewSpan / 2) {
      out.push({
        severity: "info",
        text: `Smoothing 2W=${d.smoothingBoxHz.toFixed(1)} Hz is comparable to the viewed range (${viewSpan.toFixed(1)} Hz).`,
      });
    }
  }

  // Short-window multitaper erasing narrow events (e.g. ripples).
  if (
    d.isMultitaper &&
    d.windowDurationSec > 0 &&
    d.windowDurationSec <= 0.2 &&
    d.smoothingBoxHz != null &&
    d.smoothingBoxHz >= 20
  ) {
    out.push({
      severity: "warn",
      text: `Multitaper at T=${(d.windowDurationSec * 1000).toFixed(0)} ms gives 2W=${d.smoothingBoxHz.toFixed(0)} Hz — wider than a ripple band; use Morlet or a longer window for narrow high-frequency events.`,
    });
  }

  if (config.decimationFactor > 1) {
    out.push({
      severity: "info",
      text: `Decimation ×${config.decimationFactor} active: anti-alias low-pass applied below the new Nyquist ${d.nyquistHz.toFixed(0)} Hz before dropping samples.`,
    });
  }

  // Anti-alias rolloff zone near Nyquist (top ~15%).
  const rolloffStart = d.nyquistHz * 0.85;
  if (config.fMaxHz > rolloffStart) {
    out.push({
      severity: "info",
      text: `The top ~15% below Nyquist (${rolloffStart.toFixed(0)}–${d.nyquistHz.toFixed(0)} Hz) is likely distorted by anti-alias rolloff.`,
    });
  }

  return out;
};
