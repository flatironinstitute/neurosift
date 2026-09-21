import { ComputeConfig } from "./spectralConfig";

export type SpectrogramInput = {
  // One signal per selected channel, already in physical units and all the
  // same length. Multiple signals are averaged (mean power spectrogram).
  signals: number[][];
  // Native sampling rate (before any decimation the config requests).
  samplingFrequency: number;
  // Time (seconds) corresponding to signals[*][0].
  signalStartTimeSec: number;
  // Desired number of output time columns. The STFT is computed at a fine
  // analysis step over all samples and power is averaged into this many columns
  // (anti-aliasing the time axis before decimation to display resolution).
  targetColumns: number;
  // All processing that changes the underlying numbers (taper/estimator,
  // detrend, filtering, notch, decimation, artifact rejection).
  config: ComputeConfig;
};

// dB power spectral density, one value per (window, frequency) bin. Values are
// the raw per-window power (display normalization/filtering are applied later,
// at render time). Columns flagged in `gaps` were rejected as artifacts.
export type SpectrogramResult = {
  powers: number[];
  numWindows: number;
  numFreqs: number;
  firstWindowCenterTimeSec: number;
  windowStepSec: number;
  freqStartHz: number;
  freqStepHz: number;
  minPowerDb: number;
  maxPowerDb: number;
  // Effective sampling rate actually used (native / decimation factor).
  effectiveSamplingFrequency: number;
  // Per-column artifact flag; true columns are gaps (no valid data).
  gaps: boolean[];
};
