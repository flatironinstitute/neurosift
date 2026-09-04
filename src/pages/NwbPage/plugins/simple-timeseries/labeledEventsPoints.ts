export type LabeledEventPoint = {
  timestamp: number;
  value: number;
};

// Build the scatter points for a LabeledEvents series. The timeseries client
// returns data channel-major, one array per channel, and a LabeledEvents
// series has a single channel of integer label indices, so the points come
// from data[0] paired with the timestamps.
export const labeledEventPoints = (
  timestamps: number[],
  data: number[][],
): LabeledEventPoint[] => {
  const values = data[0] ?? [];
  const n = Math.min(timestamps.length, values.length);
  const points: LabeledEventPoint[] = [];
  for (let i = 0; i < n; i++) {
    points.push({ timestamp: timestamps[i], value: values[i] });
  }
  return points;
};

// The distinct label indices present in the points, in increasing order.
export const distinctLabelValues = (points: LabeledEventPoint[]): number[] =>
  Array.from(new Set(points.map((p) => p.value))).sort((a, b) => a - b);
