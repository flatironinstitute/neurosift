// Discrete prolate spheroidal sequences (Slepian tapers) for multitaper
// estimation. The tapers are the eigenvectors of the symmetric tridiagonal
// matrix (Percival & Walden 8.3) whose eigenvalues order them by spectral
// concentration. For efficiency we compute all eigenvalues (O(N^2), no vector
// accumulation), take the K largest, and recover each eigenvector by inverse
// iteration (O(N) per taper) — cheaper and lighter than a dense eigenvector
// solve for large N.

// QL with implicit shifts on a symmetric tridiagonal matrix, eigenvalues only.
// diag/offdiag are copied; offdiag[i] is the element between rows i-1 and i,
// offdiag[0] unused.
const tridiagonalEigenvalues = (
  diagIn: Float64Array,
  offIn: Float64Array,
): Float64Array => {
  const n = diagIn.length;
  const d = Float64Array.from(diagIn);
  const e = new Float64Array(n);
  for (let i = 1; i < n; i++) e[i - 1] = offIn[i];
  e[n - 1] = 0;

  for (let l = 0; l < n; l++) {
    let iter = 0;
    let m: number;
    do {
      for (m = l; m < n - 1; m++) {
        const dd = Math.abs(d[m]) + Math.abs(d[m + 1]);
        if (Math.abs(e[m]) <= Number.EPSILON * dd) break;
      }
      if (m !== l) {
        if (iter++ === 50) break; // give up gracefully
        let g = (d[l + 1] - d[l]) / (2 * e[l]);
        let r = Math.hypot(g, 1);
        g = d[m] - d[l] + e[l] / (g + (g >= 0 ? Math.abs(r) : -Math.abs(r)));
        let s = 1;
        let c = 1;
        let p = 0;
        let i: number;
        for (i = m - 1; i >= l; i--) {
          const f = s * e[i];
          const b = c * e[i];
          r = Math.hypot(f, g);
          e[i + 1] = r;
          if (r === 0) {
            d[i + 1] -= p;
            e[m] = 0;
            break;
          }
          s = f / r;
          c = g / r;
          g = d[i + 1] - p;
          r = (d[i] - g) * s + 2 * c * b;
          p = s * r;
          d[i + 1] = g + p;
          g = c * r - b;
        }
        if (r === 0 && i >= l) continue;
        d[l] -= p;
        e[l] = g;
        e[m] = 0;
      }
    } while (m !== l);
  }
  return d;
};

// Solve a symmetric tridiagonal system (T - shift*I) x = rhs via the Thomas
// algorithm. diag/off are the matrix bands (off[i] between i-1 and i).
const solveTridiagonal = (
  diag: Float64Array,
  off: Float64Array,
  shift: number,
  rhs: Float64Array,
): Float64Array => {
  const n = diag.length;
  const cprime = new Float64Array(n);
  const dprime = new Float64Array(n);
  let denom = diag[0] - shift;
  if (Math.abs(denom) < 1e-300) denom = 1e-300;
  cprime[0] = (n > 1 ? off[1] : 0) / denom;
  dprime[0] = rhs[0] / denom;
  for (let i = 1; i < n; i++) {
    const a = off[i]; // sub-diagonal
    const cAbove = i + 1 < n ? off[i + 1] : 0; // super-diagonal (symmetric)
    denom = diag[i] - shift - a * cprime[i - 1];
    if (Math.abs(denom) < 1e-300) denom = 1e-300;
    cprime[i] = cAbove / denom;
    dprime[i] = (rhs[i] - a * dprime[i - 1]) / denom;
  }
  const x = new Float64Array(n);
  x[n - 1] = dprime[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dprime[i] - cprime[i] * x[i + 1];
  return x;
};

const normalize = (x: Float64Array): number => {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  const norm = Math.sqrt(s);
  if (norm > 0) for (let i = 0; i < x.length; i++) x[i] /= norm;
  return norm;
};

const dpssCache = new Map<string, Float64Array[]>();

// Compute K DPSS tapers of length N for time-bandwidth product NW. Cached by
// (N, NW, K). Each taper is unit-energy.
export const computeDpss = (
  N: number,
  NW: number,
  K: number,
): Float64Array[] => {
  const kk = Math.max(1, Math.min(Math.floor(K), N));
  const key = `${N}|${NW}|${kk}`;
  const cached = dpssCache.get(key);
  if (cached) return cached;

  // Slepian tridiagonal matrix.
  const W = NW / N;
  const cos2piW = Math.cos(2 * Math.PI * W);
  const diag = new Float64Array(N);
  const off = new Float64Array(N); // off[i] between i-1 and i
  for (let i = 0; i < N; i++) {
    const t = (N - 1) / 2 - i;
    diag[i] = t * t * cos2piW;
  }
  for (let i = 1; i < N; i++) off[i] = 0.5 * i * (N - i);

  const eigenvalues = tridiagonalEigenvalues(diag, off);
  // Indices of the K largest eigenvalues (most concentrated tapers).
  const order = Array.from({ length: N }, (_, i) => i).sort(
    (a, b) => eigenvalues[b] - eigenvalues[a],
  );

  const tapers: Float64Array[] = [];
  for (let t = 0; t < kk; t++) {
    const lambda = eigenvalues[order[t]];
    // Inverse iteration; shift just off the eigenvalue to avoid singularity.
    const scale = Math.abs(lambda) + 1;
    const shift = lambda + 1e-7 * scale;
    let x = new Float64Array(N);
    for (let i = 0; i < N; i++)
      x[i] = Math.sin((Math.PI * (i + 1) * (t + 1)) / (N + 1));
    normalize(x);
    for (let iter = 0; iter < 3; iter++) {
      const y = solveTridiagonal(diag, off, shift, x);
      normalize(y);
      x = y;
    }
    // Sign convention: make the taper's sum positive for even orders and its
    // first lobe positive for odd — power spectra are sign-invariant, but this
    // keeps outputs deterministic.
    let sum = 0;
    for (let i = 0; i < N; i++) sum += x[i];
    if (t % 2 === 0) {
      if (sum < 0) for (let i = 0; i < N; i++) x[i] = -x[i];
    } else {
      let firstMoment = 0;
      for (let i = 0; i < N; i++) firstMoment += (i - (N - 1) / 2) * x[i];
      if (firstMoment < 0) for (let i = 0; i < N; i++) x[i] = -x[i];
    }
    tapers.push(x);
  }

  dpssCache.set(key, tapers);
  return tapers;
};
