import { fftInPlace } from "../fft";

// Reference frequency for the frequency-dependent cycles law.
const REF_FREQ_HZ = 10;

const nextPow2 = (n: number): number => {
  let p = 1;
  while (p < n) p *= 2;
  return p;
};

const ifftInPlace = (re: Float64Array, im: Float64Array): void => {
  for (let i = 0; i < im.length; i++) im[i] = -im[i];
  fftInPlace(re, im);
  const n = re.length;
  for (let i = 0; i < n; i++) {
    re[i] /= n;
    im[i] = -im[i] / n;
  }
};

// Morlet wavelet spectrogram: analytic power |CWT|^2 on the same linear
// frequency grid used by the taper path (numFreqs = windowSize/2 + 1), averaged
// across channels and binned into numColumns time columns. Computed by FFT
// (multiply the analytic signal spectrum by a Gaussian centered at each
// frequency, inverse-transform, take squared magnitude). DC bin is left at 0.
export const morletSpectrogram = (
  signals: number[][],
  fs: number,
  windowSize: number,
  cycles: number,
  freqDependent: boolean,
  numColumns: number,
): { powers: number[]; numColumns: number; numFreqs: number } => {
  const numFreqs = windowSize / 2 + 1;
  const numSignals = signals.length;
  const L = numSignals > 0 ? signals[0].length : 0;
  const nCols = Math.max(0, Math.min(Math.floor(numColumns), L));
  if (numSignals === 0 || L === 0 || nCols === 0) {
    return { powers: new Array(0), numColumns: 0, numFreqs };
  }

  const Lp = nextPow2(L);
  const freqStep = fs / windowSize;

  // FFT each channel once (zero-padded).
  const spectra: { re: Float64Array; im: Float64Array }[] = signals.map(
    (sig) => {
      const re = new Float64Array(Lp);
      const im = new Float64Array(Lp);
      for (let i = 0; i < L; i++) re[i] = sig[i];
      fftInPlace(re, im);
      return { re, im };
    },
  );

  const cyclesAt = (f: number): number =>
    freqDependent
      ? Math.min(40, Math.max(3, (cycles * f) / REF_FREQ_HZ))
      : cycles;

  const colAccum = new Float64Array(nCols * numFreqs);
  const colCount = new Float64Array(nCols);
  for (let t = 0; t < L; t++)
    colCount[Math.floor((t * nCols) / L)] += numSignals;

  const kre = new Float64Array(Lp);
  const kim = new Float64Array(Lp);
  const nyquistBin = Lp / 2;

  for (let fi = 1; fi < numFreqs; fi++) {
    const f = fi * freqStep;
    const sigmaF = f / cyclesAt(f);
    if (sigmaF <= 0) continue;
    const twoSigma2 = 2 * sigmaF * sigmaF;

    for (let s = 0; s < numSignals; s++) {
      const { re: Sre, im: Sim } = spectra[s];
      // Analytic (positive frequencies only) Gaussian band around f.
      for (let j = 0; j <= nyquistBin; j++) {
        const nu = (j * fs) / Lp;
        const d = nu - f;
        const g = Math.exp(-(d * d) / twoSigma2) * (j === 0 ? 1 : 2);
        kre[j] = Sre[j] * g;
        kim[j] = Sim[j] * g;
      }
      for (let j = nyquistBin + 1; j < Lp; j++) {
        kre[j] = 0;
        kim[j] = 0;
      }
      ifftInPlace(kre, kim);
      for (let t = 0; t < L; t++) {
        const power = kre[t] * kre[t] + kim[t] * kim[t];
        const col = Math.floor((t * nCols) / L);
        colAccum[col * numFreqs + fi] += power;
      }
    }
  }

  const powers: number[] = new Array(nCols * numFreqs);
  for (let c = 0; c < nCols; c++) {
    const contrib = colCount[c] || 1;
    const base = c * numFreqs;
    for (let fi = 0; fi < numFreqs; fi++) {
      powers[base + fi] = colAccum[base + fi] / contrib;
    }
  }

  return { powers, numColumns: nCols, numFreqs };
};
