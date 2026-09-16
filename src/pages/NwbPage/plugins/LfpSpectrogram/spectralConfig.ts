import { ColormapName } from "./colormap";

// Full spectral-estimation configuration for the viewer. Governing principle:
// every processing stage defaults to OFF / identity so first launch shows the
// least-processed spectrogram the data allows. The one exception is the window
// taper (cutting a finite window is itself an operation): the neutral baseline
// is single-taper Hann, with "boxcar" available to see raw leakage.

export type TaperMethod = "boxcar" | "hann" | "multitaper" | "morlet";
export type DetrendMode = "none" | "constant" | "linear";
export type NormalizationMode = "none" | "whiten" | "zscore" | "baseline";
export type ColorLimitMode = "auto" | "manual";
export type ChannelMode = "mean" | "perChannel";

export type SpectralConfig = {
  // --- Estimator / taper ---
  taper: TaperMethod;
  nw: number; // multitaper time-bandwidth product
  k: number; // multitaper number of tapers
  waveletCycles: number; // Morlet: number of cycles
  waveletFreqDependent: boolean; // Morlet: scale cycles with frequency
  windowSizeSamples: number; // window length T, in native samples
  overlap: number; // fraction in [0, 0.95)
  detrend: DetrendMode; // per-window detrend

  // --- Preprocessing (all default off / identity) ---
  highPassHz: number | null;
  lowPassHz: number | null;
  filterOrder: number;
  zeroPhase: boolean;
  notchEnabled: boolean;
  notchBaseHz: 50 | 60;
  notchHarmonics: number;
  fTestRemove: boolean; // Thomson F-test line removal (multitaper only)
  decimationFactor: number; // 1 = off
  artifactThresholdSd: number | null; // reject windows whose |z| exceeds this

  // --- Normalization (default none / raw dB) ---
  normalization: NormalizationMode;
  baselineWindowSec: [number, number] | null;

  // --- Color scale (view-only) ---
  colorLimitMode: ColorLimitMode;
  colorLimitLock: boolean;
  colorMinDb: number | null;
  colorMaxDb: number | null;
  autoPercentile: number; // e.g. 2 => 2nd..98th percentile

  // --- Frequency axis (view-only) ---
  fMinHz: number;
  fMaxHz: number;
  logFreq: boolean;
  colormap: ColormapName;

  // --- Channels ---
  channelMode: ChannelMode;
};

// The identity default. fMaxHz is filled in per-file (Nyquist-dependent) by the
// view; here it is a placeholder that the view clamps.
export const makeDefaultConfig = (nyquistHz: number): SpectralConfig => ({
  taper: "hann",
  nw: 3,
  k: 5,
  waveletCycles: 7,
  waveletFreqDependent: false,
  windowSizeSamples: 1024,
  overlap: 0.5,
  detrend: "none",

  highPassHz: null,
  lowPassHz: null,
  filterOrder: 4,
  zeroPhase: true,
  notchEnabled: false,
  notchBaseHz: 60,
  notchHarmonics: 3,
  fTestRemove: false,
  decimationFactor: 1,
  artifactThresholdSd: null,

  normalization: "none",
  baselineWindowSec: null,

  colorLimitMode: "auto",
  colorLimitLock: false,
  colorMinDb: null,
  colorMaxDb: null,
  autoPercentile: 2,

  fMinHz: 0,
  fMaxHz: nyquistHz,
  logFreq: false,
  colormap: "viridis",

  channelMode: "mean",
});

// Fields that change the underlying numbers and therefore require recomputation
// (and form the cache key). Everything else is view-only and must never trigger
// a recompute.
export type ComputeConfig = Pick<
  SpectralConfig,
  | "taper"
  | "nw"
  | "k"
  | "waveletCycles"
  | "waveletFreqDependent"
  | "windowSizeSamples"
  | "overlap"
  | "detrend"
  | "highPassHz"
  | "lowPassHz"
  | "filterOrder"
  | "zeroPhase"
  | "notchEnabled"
  | "notchBaseHz"
  | "notchHarmonics"
  | "fTestRemove"
  | "decimationFactor"
  | "artifactThresholdSd"
>;

const COMPUTE_KEYS: (keyof ComputeConfig)[] = [
  "taper",
  "nw",
  "k",
  "waveletCycles",
  "waveletFreqDependent",
  "windowSizeSamples",
  "overlap",
  "detrend",
  "highPassHz",
  "lowPassHz",
  "filterOrder",
  "zeroPhase",
  "notchEnabled",
  "notchBaseHz",
  "notchHarmonics",
  "fTestRemove",
  "decimationFactor",
  "artifactThresholdSd",
];

export const computeConfigKey = (c: ComputeConfig): string =>
  COMPUTE_KEYS.map((key) => `${key}=${JSON.stringify(c[key])}`).join("|");

// Largest legal number of tapers for a given NW: 2*NW - 1 (rounded down),
// at least 1. Requesting more is clamped and warned.
export const maxLegalK = (nw: number): number =>
  Math.max(1, Math.floor(2 * nw - 1));

// Half-bandwidth W = NW / T (Hz), where T is the window duration in seconds.
export const halfBandwidthHz = (
  nw: number,
  windowDurationSec: number,
): number => (windowDurationSec > 0 ? nw / windowDurationSec : 0);

// Effective sampling rate and Nyquist after decimation.
export const effectiveSamplingFrequency = (
  fs: number,
  decimationFactor: number,
): number => fs / Math.max(1, Math.floor(decimationFactor));

// List of config fields differing from the identity default, for the
// "processing active" indicators. Compares against a default built with the
// same Nyquist so fMaxHz isn't spuriously flagged.
export const modifiedFields = (
  c: SpectralConfig,
  nyquistHz: number,
): Set<keyof SpectralConfig> => {
  const def = makeDefaultConfig(nyquistHz);
  const out = new Set<keyof SpectralConfig>();
  (Object.keys(def) as (keyof SpectralConfig)[]).forEach((key) => {
    if (JSON.stringify(c[key]) !== JSON.stringify(def[key])) out.add(key);
  });
  return out;
};
