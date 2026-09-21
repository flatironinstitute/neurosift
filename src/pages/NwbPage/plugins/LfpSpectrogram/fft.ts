// Minimal in-place radix-2 Cooley-Tukey FFT.
// Operates on separate real/imaginary arrays whose length must be a power of two.
export const fftInPlace = (re: Float64Array, im: Float64Array): void => {
  const n = re.length;
  if (n <= 1) return;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of two (got ${n})`);
  }

  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }

  // Danielson-Lanczos butterflies
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + half];
        const bIm = im[i + k + half];
        const twiddledRe = bRe * curRe - bIm * curIm;
        const twiddledIm = bRe * curIm + bIm * curRe;
        re[i + k] = aRe + twiddledRe;
        im[i + k] = aIm + twiddledIm;
        re[i + k + half] = aRe - twiddledRe;
        im[i + k + half] = aIm - twiddledIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
};
