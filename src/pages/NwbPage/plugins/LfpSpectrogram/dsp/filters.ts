// IIR filtering: Butterworth low/high-pass designed as a cascade of biquads via
// the bilinear transform, an optional zero-phase (forward-backward) application,
// an RBJ notch, and anti-aliased decimation. All default off in the config; a
// caller only invokes these when the user turns a stage on.

export type Biquad = {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
};

type Complex = { re: number; im: number };
const cDiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return {
    re: (a.re * b.re + a.im * b.im) / d,
    im: (a.im * b.re - a.re * b.im) / d,
  };
};

// Design a Butterworth low/high-pass as second-order sections.
export const designButterworth = (
  order: number,
  type: "low" | "high",
  cutoffHz: number,
  fs: number,
): Biquad[] => {
  const N = Math.max(1, Math.floor(order));
  const nyq = fs / 2;
  const fc = Math.min(Math.max(cutoffHz, 1e-6), nyq * 0.999);
  const fs2 = 2 * fs;
  const wc = fs2 * Math.tan((Math.PI * fc) / fs); // prewarped analog cutoff

  // Analog prototype poles on the unit circle (left half plane).
  const analogPoles: Complex[] = [];
  for (let k = 0; k < N; k++) {
    const theta = (Math.PI * (2 * k + 1)) / (2 * N);
    const proto: Complex = { re: -Math.sin(theta), im: Math.cos(theta) };
    // Low-pass: scale by wc. High-pass: wc / proto.
    analogPoles.push(
      type === "low"
        ? { re: wc * proto.re, im: wc * proto.im }
        : cDiv({ re: wc, im: 0 }, proto),
    );
  }

  // Bilinear transform poles to the z-plane.
  const zPoles = analogPoles.map((p) =>
    cDiv({ re: fs2 + p.re, im: p.im }, { re: fs2 - p.re, im: -p.im }),
  );

  // Build biquads by pairing conjugate poles. For even N all poles pair up; for
  // odd N the last pole is real (a first-order section).
  const sections: Biquad[] = [];
  const numZeroTemplate =
    type === "low" ? { b0: 1, b1: 2, b2: 1 } : { b0: 1, b1: -2, b2: 1 };
  const firstOrderNum = type === "low" ? { b0: 1, b1: 1 } : { b0: 1, b1: -1 };

  const nPairs = Math.floor(N / 2);
  for (let i = 0; i < nPairs; i++) {
    const zp = zPoles[i];
    const a1 = -2 * zp.re;
    const a2 = zp.re * zp.re + zp.im * zp.im;
    sections.push({ ...numZeroTemplate, a1, a2 });
  }
  if (N % 2 === 1) {
    const zp = zPoles[N - 1];
    sections.push({
      b0: firstOrderNum.b0,
      b1: firstOrderNum.b1,
      b2: 0,
      a1: -zp.re,
      a2: 0,
    });
  }

  // Normalize the cascade gain to 1 at DC (low-pass) or Nyquist (high-pass).
  const zref = type === "low" ? 1 : -1; // z^-1 evaluation point
  let gain = 1;
  for (const s of sections) {
    const num = s.b0 + s.b1 * zref + s.b2 * zref * zref;
    const den = 1 + s.a1 * zref + s.a2 * zref * zref;
    gain *= num / den;
  }
  if (sections.length > 0 && gain !== 0) {
    sections[0].b0 /= gain;
    sections[0].b1 /= gain;
    sections[0].b2 /= gain;
  }
  return sections;
};

// RBJ notch biquad at f0 with quality factor Q.
export const designNotch = (f0Hz: number, fs: number, Q = 30): Biquad => {
  const w0 = (2 * Math.PI * f0Hz) / fs;
  const cosw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * Q);
  const a0 = 1 + alpha;
  return {
    b0: 1 / a0,
    b1: (-2 * cosw) / a0,
    b2: 1 / a0,
    a1: (-2 * cosw) / a0,
    a2: (1 - alpha) / a0,
  };
};

const applyBiquad = (x: Float64Array, s: Biquad): Float64Array => {
  const y = new Float64Array(x.length);
  let z1 = 0;
  let z2 = 0;
  for (let n = 0; n < x.length; n++) {
    const xn = x[n];
    const yn = s.b0 * xn + z1;
    z1 = s.b1 * xn - s.a1 * yn + z2;
    z2 = s.b2 * xn - s.a2 * yn;
    y[n] = yn;
  }
  return y;
};

const applySections = (x: Float64Array, sections: Biquad[]): Float64Array => {
  let y = x;
  for (const s of sections) y = applyBiquad(y, s);
  return y;
};

const reversed = (x: Float64Array): Float64Array => {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[x.length - 1 - i];
  return y;
};

// Apply an SOS filter. Zero-phase runs it forward then backward (filtfilt),
// which also squares the magnitude response (so the effective order doubles).
export const applyFilter = (
  x: Float64Array,
  sections: Biquad[],
  zeroPhase: boolean,
): Float64Array => {
  if (sections.length === 0) return x;
  const forward = applySections(x, sections);
  if (!zeroPhase) return forward;
  const back = applySections(reversed(forward), sections);
  return reversed(back);
};

// Anti-aliased decimation: low-pass below the new Nyquist (fs / (2*factor)),
// then keep every `factor`-th sample. Returns the decimated signal.
export const decimate = (
  x: Float64Array,
  factor: number,
  fs: number,
  order = 8,
): Float64Array => {
  const M = Math.max(1, Math.floor(factor));
  if (M === 1) return x;
  const newNyquist = fs / (2 * M);
  const sections = designButterworth(order, "low", newNyquist * 0.8, fs);
  const filtered = applyFilter(x, sections, true);
  const outLen = Math.ceil(filtered.length / M);
  const out = new Float64Array(outLen);
  for (let i = 0; i < outLen; i++) out[i] = filtered[i * M];
  return out;
};
