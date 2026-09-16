import TimeseriesClient from "../simple-timeseries/TimeseriesClient";

export type AlignedTrial = {
  // Row index into the intervals table (preserved so group-by values can be
  // matched per row without reloading the snippet data).
  index: number;
  // Times relative to the alignment event (seconds).
  times: number[];
  // Signal values for a single channel over the snippet.
  roiValues: number[];
};

// The rows of the intervals table that a panel actually plots for one
// alignment column: the first maxIntervals rows whose alignment time is finite.
// A NaN alignment time is allowed in the table and simply excludes that row for
// this alignment -- e.g. a `reward_start_time` column is NaN on every
// unrewarded trial, so grouping by `rewarded` leaves the "0" group empty. The
// legend counts and the snippet loader both go through this, so what is counted
// is exactly what is drawn.
export const plottedRowIndexes = (
  alignTimes: ArrayLike<number>,
  maxIntervals: number,
): number[] => {
  const indexes: number[] = [];
  for (let i = 0; i < alignTimes.length && indexes.length < maxIntervals; i++) {
    if (isFinite(alignTimes[i])) indexes.push(i);
  }
  return indexes;
};

// Extract short snippets of a single channel of a TimeSeries around each
// alignment time. Each snippet spans [alignTime + windowStart, alignTime +
// windowEnd] and its timestamps are shifted so that the alignment event sits at
// t = 0. Reads are issued with a small amount of concurrency to stay responsive
// without overwhelming the remote HDF5 reader.
export const loadEventRelatedSnippets = async (
  client: TimeseriesClient,
  alignTimes: number[],
  channel: number,
  windowRange: { start: number; end: number },
  opts: {
    maxIntervals: number;
    concurrency?: number;
    canceler?: { canceled: boolean };
    onProgress?: (loaded: number, total: number) => void;
  },
): Promise<AlignedTrial[]> => {
  // Rows to load, keeping each row's original index so group-by values still
  // line up.
  const entries = plottedRowIndexes(alignTimes, opts.maxIntervals).map(
    (index) => ({ index, t: alignTimes[index] }),
  );

  const trials: (AlignedTrial | undefined)[] = new Array(entries.length);
  const concurrency = Math.max(
    1,
    Math.min(opts.concurrency ?? 8, entries.length),
  );
  // Report the true denominator (valid intervals to load) up front so the
  // progress indicator never shows the raw max-intervals cap.
  opts.onProgress?.(0, entries.length);
  // Clamp the channel defensively; the selected series may have fewer channels.
  const ch = Math.max(0, Math.min(channel, client.numChannels - 1));

  let nextIndex = 0;
  let loaded = 0;

  const worker = async () => {
    for (;;) {
      const k = nextIndex++;
      if (k >= entries.length) break;
      if (opts.canceler?.canceled) break;
      const { index, t } = entries[k];
      try {
        const { timestamps, data } = await client.getDataForTimeRange(
          t + windowRange.start,
          t + windowRange.end,
          ch,
          ch + 1,
        );
        const values = data[0] || [];
        trials[k] = {
          index,
          times: timestamps.map((ts) => ts - t),
          roiValues: values,
        };
      } catch (err) {
        // Skip an interval that fails to load (an out-of-range/NaN time or a
        // transient read error) rather than failing the whole panel.
        console.warn(`Skipping interval ${index} (t=${t}):`, err);
      }
      loaded += 1;
      opts.onProgress?.(loaded, entries.length);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  return trials.filter((tr): tr is AlignedTrial => tr !== undefined);
};
