import { beforeEach, describe, expect, it, vi } from "vitest";

// An in-memory stand-in for the HDF5 interface: each dataset is a flat
// row-major array with a shape and attributes, and slices return the
// flattened rectangle, which is what the real interface returns.
type FakeDataset = {
  shape: number[];
  attrs: { [key: string]: unknown };
  values: number[] | number;
};
const datasets: { [path: string]: FakeDataset } = {};
const dataRequests: { path: string; slice?: [number, number][] }[] = [];

const sliceDataset = (ds: FakeDataset, slice?: [number, number][]) => {
  if (typeof ds.values === "number") return ds.values;
  if (!slice || slice.length === 0) return Float64Array.from(ds.values);
  const [i1, i2] = slice[0];
  if (ds.shape.length === 1) {
    return Float64Array.from(ds.values.slice(i1, i2));
  }
  const nCols = ds.shape[1];
  const [j1, j2] = slice.length > 1 ? slice[1] : [0, nCols];
  const out: number[] = [];
  for (let i = i1; i < i2; i++) {
    for (let j = j1; j < j2; j++) out.push(ds.values[i * nCols + j]);
  }
  return Float64Array.from(out);
};

vi.mock("@hdf5Interface", () => ({
  getHdf5Dataset: async (_url: string, path: string) => {
    const ds = datasets[path];
    if (!ds) return undefined;
    return {
      name: path.split("/").pop(),
      path,
      shape: ds.shape,
      dtype: "<f8",
      attrs: ds.attrs,
    };
  },
  getHdf5DatasetData: async (
    _url: string,
    path: string,
    o: { slice?: [number, number][] },
  ) => {
    const ds = datasets[path];
    if (!ds) return undefined;
    dataRequests.push({ path, slice: o.slice });
    return sliceDataset(ds, o.slice);
  },
  getHdf5Group: async (_url: string, path: string) => ({
    path,
    subgroups: [],
    datasets: Object.keys(datasets)
      .filter((p) => p.startsWith(path + "/"))
      .map((p) => ({ name: p.slice(path.length + 1), path: p })),
    attrs: {},
  }),
  useHdf5Group: () => undefined,
}));

const { ChunkedTimeseriesClient } = await import("./TimeseriesClient");

const group = (path: string) =>
  ({
    path,
    subgroups: [],
    datasets: Object.keys(datasets)
      .filter((p) => p.startsWith(path + "/"))
      .map((p) => ({
        name: p.slice(path.length + 1),
        path: p,
        shape: datasets[p].shape,
        dtype: "<f8",
        attrs: datasets[p].attrs,
      })),
    attrs: {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

const reset = () => {
  for (const k of Object.keys(datasets)) delete datasets[k];
  dataRequests.length = 0;
};

// A regular series at 10 Hz starting at t = 0 with 25 samples, so the
// timestamps are 0, 0.1, ..., 2.4 and the series ends at 2.5. Two channels;
// channel c sample i holds 100 * c + i.
const setupRegular = (numChannels = 2, numSamples = 25) => {
  reset();
  const values: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    for (let c = 0; c < numChannels; c++) values.push(100 * c + i);
  }
  datasets["/acq/ts/data"] = {
    shape: [numSamples, numChannels],
    attrs: { conversion: 1, offset: 0 },
    values,
  };
  datasets["/acq/ts/starting_time"] = {
    shape: [],
    attrs: { rate: 10 },
    values: 0,
  };
};

// An irregular series with hand-picked timestamps around chunk boundaries.
const irregularTimes = [0.05, 0.3, 0.98, 1.0, 1.01, 1.99, 2.5];
const setupIrregular = () => {
  reset();
  datasets["/acq/irr/data"] = {
    shape: [irregularTimes.length, 1],
    attrs: {},
    values: irregularTimes.map((_, i) => i),
  };
  datasets["/acq/irr/timestamps"] = {
    shape: [irregularTimes.length],
    attrs: {},
    values: irregularTimes,
  };
};

const expectedRegularTimes = (t1: number, t2: number) => {
  const out: number[] = [];
  for (let i = 0; i < 25; i++) {
    const t = i / 10;
    if (t >= t1 && t < t2) out.push(t);
  }
  return out;
};

describe("ChunkedTimeseriesClient with a regular series", () => {
  beforeEach(() => setupRegular());

  it("returns every sample of the series including the last one", async () => {
    const client = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    const { timestamps, data } = await client.getDataForTimeRange(0, 2.5, 0, 2);
    expect(timestamps.map((t) => +t.toFixed(6))).toEqual(
      expectedRegularTimes(0, 2.5),
    );
    expect(timestamps).toHaveLength(25);
    expect(data[0]).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(data[1]).toEqual(Array.from({ length: 25 }, (_, i) => 100 + i));
  });

  it("keeps the sample just below a chunk boundary", async () => {
    const client = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    // 0.94 is nearer to sample 9 (t = 0.9) than to sample 10, so a loader
    // that treats the nearest index as an exclusive bound drops t = 0.9.
    const { timestamps } = await client.getDataForTimeRange(0, 0.94, 0, 2);
    expect(timestamps.map((t) => +t.toFixed(6))).toEqual(
      expectedRegularTimes(0, 0.94),
    );
  });

  it("does not duplicate samples across chunk boundaries", async () => {
    const client = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    const { timestamps, data } = await client.getDataForTimeRange(
      0.5,
      2.05,
      0,
      2,
    );
    const rounded = timestamps.map((t) => +t.toFixed(6));
    expect(rounded).toEqual(expectedRegularTimes(0.5, 2.05));
    expect(new Set(rounded).size).toBe(rounded.length);
    expect(data[0]).toEqual(rounded.map((t) => Math.round(t * 10)));
  });

  it("returns the same samples whether a range is loaded at once or in pieces", async () => {
    const whole = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    const all = await whole.getDataForTimeRange(0, 2.5, 0, 2);
    const pieces = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    const a = await pieces.getDataForTimeRange(0, 0.95, 0, 2);
    const b = await pieces.getDataForTimeRange(0.95, 1.7, 0, 2);
    const c = await pieces.getDataForTimeRange(1.7, 2.5, 0, 2);
    expect([...a.timestamps, ...b.timestamps, ...c.timestamps]).toEqual(
      all.timestamps,
    );
    expect([...a.data[1], ...b.data[1], ...c.data[1]]).toEqual(all.data[1]);
  });

  it("does not load a chunk that starts exactly at the end of the range", async () => {
    const client = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
    });
    dataRequests.length = 0;
    await client.getDataForTimeRange(0, 1, 0, 2);
    const dataSlices = dataRequests
      .filter((r) => r.path === "/acq/ts/data")
      .map((r) => r.slice![0]);
    expect(dataSlices).toHaveLength(1);
  });

  it("does not load an extra channel chunk when the channel range ends on a boundary", async () => {
    setupRegular(8);
    const client = await ChunkedTimeseriesClient.create("u", group("/acq/ts"), {
      chunkSizeSec: 1,
      chunkSizeNumChannels: 8,
    });
    dataRequests.length = 0;
    const { data } = await client.getDataForTimeRange(0, 1, 0, 8);
    expect(data).toHaveLength(8);
    const channelSlices = dataRequests
      .filter((r) => r.path === "/acq/ts/data")
      .map((r) => r.slice![1]);
    expect(channelSlices).toEqual([[0, 8]]);
  });
});

describe("ChunkedTimeseriesClient with an irregular series", () => {
  beforeEach(() => setupIrregular());

  it("returns every timestamp including the last one", async () => {
    const client = await ChunkedTimeseriesClient.create(
      "u",
      group("/acq/irr"),
      { chunkSizeSec: 1 },
    );
    const { timestamps, data } = await client.getDataForTimeRange(0, 3, 0, 1);
    expect(timestamps).toEqual(irregularTimes);
    expect(data[0]).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("keeps a sample that is nearest to but below the end of the range", async () => {
    const client = await ChunkedTimeseriesClient.create(
      "u",
      group("/acq/irr"),
      { chunkSizeSec: 1 },
    );
    const { timestamps } = await client.getDataForTimeRange(0.5, 1.995, 0, 1);
    expect(timestamps).toEqual([0.98, 1.0, 1.01, 1.99]);
  });
});
