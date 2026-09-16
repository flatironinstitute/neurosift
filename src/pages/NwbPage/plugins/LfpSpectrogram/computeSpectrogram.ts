import { fftInPlace } from "./fft";
import { detrendInPlace } from "./dsp/detrend";
import { computeDpss } from "./dsp/dpss";
import {
  applyFilter,
  decimate,
  designButterworth,
  designNotch,
} from "./dsp/filters";
import { morletSpectrogram } from "./dsp/morlet";
import { maxLegalK } from "./spectralConfig";
import { SpectrogramInput, SpectrogramResult } from "./WorkerTypes";

type Taper = { samples: Float64Array; energy: number; dc: number };

// Apply the (opt-in) preprocessing chain to one channel and report the
// effective sampling rate after any decimation.
const preprocessChannel = (
  sig: number[],
  fs: number,
  c: SpectrogramInput["config"],
): { data: Float64Array; fs: number } => {
  let x = Float64Array.from(sig);
  const order = Math.max(1, Math.floor(c.filterOrder));

  if (c.highPassHz != null && c.highPassHz > 0) {
    x = applyFilter(
      x,
      designButterworth(order, "high", c.highPassHz, fs),
      c.zeroPhase,
    );
  }
  if (c.lowPassHz != null && c.lowPassHz < fs / 2) {
    x = applyFilter(
      x,
      designButterworth(order, "low", c.lowPassHz, fs),
      c.zeroPhase,
    );
  }
  if (c.notchEnabled) {
    for (let h = 1; h <= c.notchHarmonics; h++) {
      const f0 = c.notchBaseHz * h;
      if (f0 < fs / 2) x = applyFilter(x, [designNotch(f0, fs)], c.zeroPhase);
    }
  }

  let effFs = fs;
  if (c.decimationFactor > 1) {
    x = decimate(x, c.decimationFactor, fs);
    effFs = fs / Math.floor(c.decimationFactor);
  }
  return { data: x, fs: effFs };
};

const makeTapers = (
  windowSize: number,
  c: SpectrogramInput["config"],
): Taper[] => {
  const build = (samples: Float64Array): Taper => {
    let energy = 0;
    let dc = 0;
    for (let i = 0; i < samples.length; i++) {
      energy += samples[i] * samples[i];
      dc += samples[i];
    }
    return { samples, energy, dc };
  };

  if (c.taper === "boxcar") {
    const s = new Float64Array(windowSize).fill(1);
    return [build(s)];
  }
  if (c.taper === "multitaper") {
    const k = Math.max(1, Math.min(Math.floor(c.k), maxLegalK(c.nw)));
    return computeDpss(windowSize, c.nw, k).map(build);
  }
  // Hann (neutral baseline) — also the fallback path for the Morlet branch,
  // which does not use tapers.
  const s = new Float64Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    s[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }
  return [build(s)];
};

// Upper quantile of F(2, nu) at probability 1 - 1/numFreqs (closed form).
const fTestThreshold = (K: number, numFreqs: number): number => {
  const nu = 2 * K - 2;
  if (nu < 2) return Infinity;
  return (nu / 2) * (Math.pow(numFreqs, 2 / nu) - 1);
};

// PSD of one detrended window, averaging over tapers (and optionally removing
// line components with Thomson's F-test for multitaper).
const windowPsd = (
  win: Float64Array,
  tapers: Taper[],
  effFs: number,
  numFreqs: number,
  windowSize: number,
  doFtest: boolean,
  ftestThresh: number,
): Float64Array => {
  const K = tapers.length;
  // Complex tapered spectra Y_k(f).
  const Yre: Float64Array[] = [];
  const Yim: Float64Array[] = [];
  for (let k = 0; k < K; k++) {
    const re = new Float64Array(windowSize);
    const im = new Float64Array(windowSize);
    const tap = tapers[k].samples;
    for (let i = 0; i < windowSize; i++) re[i] = win[i] * tap[i];
    fftInPlace(re, im);
    Yre.push(re);
    Yim.push(im);
  }

  if (doFtest && K >= 2) {
    let sumH2 = 0;
    for (let k = 0; k < K; k++) sumH2 += tapers[k].dc * tapers[k].dc;
    if (sumH2 > 0) {
      for (let f = 0; f < numFreqs; f++) {
        let cRe = 0;
        let cIm = 0;
        for (let k = 0; k < K; k++) {
          cRe += tapers[k].dc * Yre[k][f];
          cIm += tapers[k].dc * Yim[k][f];
        }
        cRe /= sumH2;
        cIm /= sumH2;
        let den = 0;
        for (let k = 0; k < K; k++) {
          const rRe = Yre[k][f] - cRe * tapers[k].dc;
          const rIm = Yim[k][f] - cIm * tapers[k].dc;
          den += rRe * rRe + rIm * rIm;
        }
        const F =
          den > 0 ? ((K - 1) * (cRe * cRe + cIm * cIm) * sumH2) / den : 0;
        if (F > ftestThresh) {
          for (let k = 0; k < K; k++) {
            Yre[k][f] -= cRe * tapers[k].dc;
            Yim[k][f] -= cIm * tapers[k].dc;
          }
        }
      }
    }
  }

  const psd = new Float64Array(numFreqs);
  for (let f = 0; f < numFreqs; f++) {
    let acc = 0;
    for (let k = 0; k < K; k++) {
      const mag2 = Yre[k][f] * Yre[k][f] + Yim[k][f] * Yim[k][f];
      const doubled = f === 0 || f === windowSize / 2 ? mag2 : mag2 * 2;
      acc += doubled / (effFs * tapers[k].energy);
    }
    psd[f] = acc / K;
  }
  return psd;
};

export const computeSpectrogram = (
  input: SpectrogramInput,
): SpectrogramResult => {
  const {
    signals: raw,
    samplingFrequency: fsNative,
    signalStartTimeSec,
  } = input;
  const c = input.config;

  if (raw.length === 0) {
    return emptyResult(fsNative);
  }

  // 1. Preprocess each channel; decimation sets the effective sampling rate.
  const pre = raw.map((s) => preprocessChannel(s, fsNative, c));
  const effFs = pre[0].fs;
  const effSignals = pre.map((p) => p.data);
  const signalLength = effSignals[0].length;
  const windowSize = c.windowSizeSamples;
  const numFreqs = windowSize / 2 + 1;
  const freqStepHz = effFs / windowSize;

  const numColumnsWanted = Math.max(1, Math.floor(input.targetColumns));

  // 2. Morlet branch is a separate CWT path.
  if (c.taper === "morlet") {
    const { powers, numColumns } = morletSpectrogram(
      effSignals as unknown as number[][],
      effFs,
      windowSize,
      c.waveletCycles,
      c.waveletFreqDependent,
      Math.min(numColumnsWanted, signalLength),
    );
    return finalize(
      powers,
      numColumns,
      numFreqs,
      // Morlet columns span the whole signal uniformly.
      signalStartTimeSec + windowSize / 2 / effFs,
      numColumns > 0 ? signalLength / numColumns / effFs : 1,
      freqStepHz,
      effFs,
      new Array(numColumns).fill(false),
    );
  }

  // 3. Taper / multitaper path over fine analysis windows.
  if (signalLength < windowSize) {
    return emptyResult(effFs);
  }
  const analysisStep = Math.max(1, Math.floor(windowSize * (1 - c.overlap)));
  const numAnalysis =
    1 + Math.floor((signalLength - windowSize) / analysisStep);
  const numColumns = Math.max(1, Math.min(numColumnsWanted, numAnalysis));

  const tapers = makeTapers(windowSize, c);
  const doFtest =
    c.fTestRemove && c.taper === "multitaper" && tapers.length >= 2;
  const ftestThresh = fTestThreshold(tapers.length, numFreqs);

  // Per-channel stats for artifact rejection.
  const chanStats = effSignals.map((x) => {
    let mean = 0;
    for (let i = 0; i < x.length; i++) mean += x[i];
    mean /= x.length || 1;
    let varSum = 0;
    for (let i = 0; i < x.length; i++) varSum += (x[i] - mean) * (x[i] - mean);
    const std = Math.sqrt(varSum / (x.length || 1));
    return { mean, std };
  });
  const artifactSd = c.artifactThresholdSd;

  const colAccum = new Float64Array(numColumns * numFreqs);
  const colContrib = new Float64Array(numColumns);
  const win = new Float64Array(windowSize);

  for (let a = 0; a < numAnalysis; a++) {
    const offset = a * analysisStep;
    const col = Math.floor((a * numColumns) / numAnalysis);
    const base = col * numFreqs;
    for (let s = 0; s < effSignals.length; s++) {
      const sig = effSignals[s];
      // Artifact check on the raw window before detrending.
      if (artifactSd != null) {
        const { mean, std } = chanStats[s];
        let reject = false;
        if (std > 0) {
          for (let i = 0; i < windowSize; i++) {
            if (Math.abs(sig[offset + i] - mean) > artifactSd * std) {
              reject = true;
              break;
            }
          }
        }
        if (reject) continue;
      }
      for (let i = 0; i < windowSize; i++) win[i] = sig[offset + i];
      detrendInPlace(win, c.detrend);
      const psd = windowPsd(
        win,
        tapers,
        effFs,
        numFreqs,
        windowSize,
        doFtest,
        ftestThresh,
      );
      for (let f = 0; f < numFreqs; f++) colAccum[base + f] += psd[f];
      colContrib[col] += 1;
    }
  }

  const powers: number[] = new Array(numColumns * numFreqs);
  const gaps: boolean[] = new Array(numColumns).fill(false);
  for (let col = 0; col < numColumns; col++) {
    const base = col * numFreqs;
    const contrib = colContrib[col];
    if (contrib === 0) {
      gaps[col] = true;
      for (let f = 0; f < numFreqs; f++) powers[base + f] = NaN;
      continue;
    }
    for (let f = 0; f < numFreqs; f++) {
      let psd = colAccum[base + f] / contrib;
      if (!(psd > 0)) psd = 1e-20;
      powers[base + f] = 10 * Math.log10(psd);
    }
  }

  const groupSize = numAnalysis / numColumns;
  const windowStepSec = (groupSize * analysisStep) / effFs;
  const firstWindowCenterTimeSec =
    signalStartTimeSec +
    (windowSize / 2 + ((groupSize - 1) / 2) * analysisStep) / effFs;

  return finalize(
    powers,
    numColumns,
    numFreqs,
    firstWindowCenterTimeSec,
    windowStepSec,
    freqStepHz,
    effFs,
    gaps,
  );
};

const finalize = (
  powers: number[],
  numWindows: number,
  numFreqs: number,
  firstWindowCenterTimeSec: number,
  windowStepSec: number,
  freqStepHz: number,
  effectiveSamplingFrequency: number,
  gaps: boolean[],
): SpectrogramResult => {
  let minPowerDb = Number.POSITIVE_INFINITY;
  let maxPowerDb = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < powers.length; i++) {
    const v = powers[i];
    if (!Number.isFinite(v)) continue;
    if (v < minPowerDb) minPowerDb = v;
    if (v > maxPowerDb) maxPowerDb = v;
  }
  if (!isFinite(minPowerDb)) minPowerDb = 0;
  if (!isFinite(maxPowerDb)) maxPowerDb = 1;
  return {
    powers,
    numWindows,
    numFreqs,
    firstWindowCenterTimeSec,
    windowStepSec,
    freqStartHz: 0,
    freqStepHz,
    minPowerDb,
    maxPowerDb,
    effectiveSamplingFrequency,
    gaps,
  };
};

const emptyResult = (effFs: number): SpectrogramResult => ({
  powers: [],
  numWindows: 0,
  numFreqs: 1,
  firstWindowCenterTimeSec: 0,
  windowStepSec: 1,
  freqStartHz: 0,
  freqStepHz: effFs / 2,
  minPowerDb: 0,
  maxPowerDb: 1,
  effectiveSamplingFrequency: effFs,
  gaps: [],
});
