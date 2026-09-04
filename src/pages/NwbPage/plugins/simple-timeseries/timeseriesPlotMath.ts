// Pure helpers for the canvas timeseries plot worker. Kept separate from the
// worker so they can be unit tested.

export const computeMin = (arr: ArrayLike<number>): number => {
  let min = Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (isNaN(arr[i])) continue;
    min = Math.min(min, arr[i]);
  }
  return min;
};

export const computeMax = (arr: ArrayLike<number>): number => {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (isNaN(arr[i])) continue;
    max = Math.max(max, arr[i]);
  }
  return max;
};

// Mean over channels of each channel's population standard deviation,
// ignoring NaN samples. Used as the unit for channel separation.
export const computeAvgStdDev = (data: number[][]): number => {
  if (data.length === 0) return 0;
  const total = data.reduce((sum, channel) => {
    const channelWithoutNaN = channel.filter((val) => !isNaN(val));
    if (channelWithoutNaN.length === 0) return sum;
    const mean =
      channelWithoutNaN.reduce((sum, val) => sum + val, 0) /
      channelWithoutNaN.length;
    const variance =
      channelWithoutNaN.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      channelWithoutNaN.length;
    return sum + Math.sqrt(variance);
  }, 0);
  return total / data.length;
};

// Raw (un-offset) extremes of every channel.
export const computeChannelRanges = (
  data: number[][],
): { mins: number[]; maxs: number[] } => {
  const mins: number[] = [];
  const maxs: number[] = [];
  for (let i = 0; i < data.length; i++) {
    mins.push(computeMin(data[i]));
    maxs.push(computeMax(data[i]));
  }
  return { mins, maxs };
};

// Vertical offset added to channel i so that channels are stacked with the
// first channel on top.
export const channelOffset = (
  numChannels: number,
  channelIndex: number,
  channelSeparation: number,
  avgStdDev: number,
): number => (numChannels - 1 - channelIndex) * channelSeparation * avgStdDev;

// The y-axis range that fits every channel after its offset is applied,
// with a little padding on each side.
export const computeYRange = (
  ranges: { mins: number[]; maxs: number[] },
  channelSeparation: number,
  avgStdDev: number,
  paddingFraction = 0.05,
): { yMin: number; yMax: number } => {
  const n = ranges.mins.length;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const offset = channelOffset(n, i, channelSeparation, avgStdDev);
    yMin = Math.min(yMin, ranges.mins[i] + offset);
    yMax = Math.max(yMax, ranges.maxs[i] + offset);
  }
  const padding = (yMax - yMin) * paddingFraction;
  return { yMin: yMin - padding, yMax: yMax + padding };
};
