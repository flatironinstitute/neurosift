// The overall time span of a set of intervals, ignoring NaN entries.
// Some files carry NaN start or stop times (an unfinished last trial, or a
// column filled in later), and a plain min/max would turn the whole range
// into NaN, which then reaches the timeseries selection and blanks the view.
// Stops fall back to starts so an interval with an unknown stop still
// counts toward the end of the range.
export const intervalsTimeRange = (
  startTimes: ArrayLike<number>,
  stopTimes: ArrayLike<number>,
): { startTime: number; endTime: number } | undefined => {
  let startTime = Infinity;
  let endTime = -Infinity;
  const n = Math.max(startTimes.length, stopTimes.length);
  for (let i = 0; i < n; i++) {
    const s = startTimes[i];
    const e = stopTimes[i];
    if (Number.isFinite(s)) {
      if (s < startTime) startTime = s;
      if (s > endTime) endTime = s;
    }
    if (Number.isFinite(e)) {
      if (e > endTime) endTime = e;
      if (e < startTime) startTime = e;
    }
  }
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    return undefined;
  }
  return { startTime, endTime };
};
