/** The time span of the first `received` samples at `timestamps`, its end just past the last; undefined if none. */
export const loadedSpan = (timestamps: ArrayLike<number>, received: number) => {
  const n = Math.min(received, timestamps.length);
  if (n === 0) return undefined;
  const step = n > 1 ? timestamps[n - 1] - timestamps[n - 2] : 0;
  const end = n < timestamps.length ? timestamps[n] : timestamps[n - 1] + step;
  return { start: timestamps[0], end };
};
