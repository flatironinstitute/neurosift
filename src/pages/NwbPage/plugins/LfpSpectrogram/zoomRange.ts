// Time-axis window arithmetic for the spectrogram view, kept pure so the
// zoom-limit behavior can be tested without mounting the view.

export type TimeRange = [number, number];

export type RangeBounds = {
  dataStart: number;
  dataEnd: number;
  minSpan: number;
  maxSpan: number;
};

// Fit a requested window inside the recording, holding its span within the
// allowed zoom range.
export const clampRange = (
  start: number,
  end: number,
  { dataStart, dataEnd, minSpan, maxSpan }: RangeBounds,
): TimeRange => {
  const span = Math.min(Math.max(end - start, minSpan), maxSpan || minSpan);
  let s = start;
  let e = s + span;
  if (e > dataEnd) {
    e = dataEnd;
    s = e - span;
  }
  if (s < dataStart) {
    s = dataStart;
    e = Math.min(s + span, dataEnd);
  }
  return [s, e];
};

// Scale the window about anchorTime, which is the time under the cursor.
//
// The span is clamped BEFORE the window is positioned. Scaling first and
// clamping afterwards (what this replaced) kept the shifted start of an
// over-sized window while cutting its span back to the limit, which turned a
// wheel tick at full zoom-out into a pan: the view walked backwards through
// time at a fixed zoom instead of doing nothing.
//
// Returns null when the span cannot change — already at a zoom limit. The
// wheel only zooms, so such a tick must leave the window exactly where it is
// rather than translating it.
export const zoomRangeAtAnchor = (
  range: TimeRange,
  factor: number,
  anchorTime: number,
  bounds: RangeBounds,
): TimeRange | null => {
  const span = range[1] - range[0];
  const limited = Math.min(
    Math.max(span * factor, bounds.minSpan),
    bounds.maxSpan || bounds.minSpan,
  );
  if (limited === span) return null;
  const frac = span > 0 ? (anchorTime - range[0]) / span : 0.5;
  const start = anchorTime - frac * limited;
  return clampRange(start, start + limited, bounds);
};
