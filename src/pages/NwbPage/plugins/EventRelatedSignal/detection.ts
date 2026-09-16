// True if the group looks like a TimeSeries with a sampled data array, i.e. it
// has a `data` dataset (1D single-channel or 2D time-by-channel) together with
// either explicit `timestamps` or a regular `starting_time`.
//
// Series with a regular `starting_time` but a non-positive `rate` (e.g. 0.0 Hz)
// are excluded -- they have no meaningful sampling and can't be aligned. Series
// that use `timestamps` are kept; their rate is approximated from the
// timestamps by the TimeseriesClient.
export const isTimeSeriesLikeGroup = (
  datasets: {
    name: string;
    shape: number[];
    attrs?: { [key: string]: unknown };
  }[],
): boolean => {
  const dataDataset = datasets.find((ds) => ds.name === "data");
  if (!dataDataset) return false;
  const numDims = dataDataset.shape.length || 0;
  if (![1, 2].includes(numDims)) return false;

  const timestamps = datasets.find((ds) => ds.name === "timestamps");
  if (timestamps) return true;

  const startingTime = datasets.find((ds) => ds.name === "starting_time");
  if (startingTime) {
    const rate = Number(startingTime.attrs?.["rate"]);
    // Exclude only when the rate is known and non-positive (e.g. 0.0 Hz). If
    // the rate is absent from the listing, keep the series rather than risk
    // hiding a valid one.
    if (isFinite(rate)) return rate > 0;
    return true;
  }

  return false;
};

// The amount of data per channel for a timeseries-like group: the number of
// time samples (the first dimension of `data`). Used to order series so the
// lightest one -- which loads/renders fastest -- can be the default.
export const timeSeriesSamplesPerChannel = (
  datasets: { name: string; shape: number[] }[],
): number => {
  const dataDataset = datasets.find((ds) => ds.name === "data");
  return dataDataset?.shape[0] ?? 0;
};
