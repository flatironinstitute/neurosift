// Statistics used to scale channel separation. Samples that could not be
// loaded are NaN (a channel with a different sampling rate, or a load that
// was cut short), and one NaN would otherwise poison the separation of
// every channel, so NaN samples and NaN channels are left out.

export const channelStdev = (x: ArrayLike<number>): number => {
  let n = 0;
  let sum = 0;
  for (let i = 0; i < x.length; i++) {
    if (isNaN(x[i])) continue;
    n++;
    sum += x[i];
  }
  if (n === 0) return NaN;
  const mean = sum / n;
  let sum2 = 0;
  for (let i = 0; i < x.length; i++) {
    if (isNaN(x[i])) continue;
    sum2 += (x[i] - mean) ** 2;
  }
  return Math.sqrt(sum2 / n);
};

export const computeMedian = (x: number[]): number => {
  const y = x.filter((v) => !isNaN(v)).sort((a, b) => a - b);
  if (y.length === 0) return 0;
  if (y.length % 2 === 1) {
    return y[Math.floor(y.length / 2)];
  }
  return (y[y.length / 2 - 1] + y[y.length / 2]) / 2;
};
