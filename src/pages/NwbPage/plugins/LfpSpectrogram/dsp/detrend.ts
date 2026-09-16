import { DetrendMode } from "../spectralConfig";

// Detrend a window in place. "constant" removes the mean; "linear" removes the
// least-squares line. "none" leaves the data untouched (the default).
export const detrendInPlace = (win: Float64Array, mode: DetrendMode): void => {
  const n = win.length;
  if (n === 0 || mode === "none") return;
  if (mode === "constant") {
    let mean = 0;
    for (let i = 0; i < n; i++) mean += win[i];
    mean /= n;
    for (let i = 0; i < n; i++) win[i] -= mean;
    return;
  }
  // linear: fit y = a + b*x with x centered, then subtract.
  const xbar = (n - 1) / 2;
  let sxx = 0;
  let sxy = 0;
  let sy = 0;
  for (let i = 0; i < n; i++) {
    const x = i - xbar;
    sxx += x * x;
    sxy += x * win[i];
    sy += win[i];
  }
  const b = sxx > 0 ? sxy / sxx : 0;
  const a = sy / n;
  for (let i = 0; i < n; i++) win[i] -= a + b * (i - xbar);
};
