import { beforeEach, describe, expect, it, vi } from "vitest";

let timestamps: number[] = [];
const slices: [number, number][] = [];

vi.mock("@hdf5Interface", () => ({
  getHdf5Dataset: async (_url: string, path: string) =>
    path.endsWith("/timestamps")
      ? {
          name: "timestamps",
          path,
          shape: [timestamps.length],
          dtype: "<f8",
          attrs: {},
        }
      : undefined,
  getHdf5DatasetData: async (
    _url: string,
    path: string,
    o: { slice?: [number, number][] },
  ) => {
    if (!path.endsWith("/timestamps")) return undefined;
    const [i1, i2] = o.slice?.[0] ?? [0, timestamps.length];
    slices.push([i1, i2]);
    if (i1 < 0 || i2 > timestamps.length || i2 < i1) {
      throw new Error(`invalid slice ${i1}:${i2}`);
    }
    return Float64Array.from(timestamps.slice(i1, i2));
  },
  useHdf5Group: () => undefined,
}));

const { IrregularTimeseriesTimestampsClient } =
  await import("./TimeseriesTimestampsClient");

describe("IrregularTimeseriesTimestampsClient", () => {
  beforeEach(() => {
    slices.length = 0;
  });

  it("initializes a series with fewer than ten samples", async () => {
    timestamps = [1.5, 2.5, 4.0];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await c.initialize();
    expect(c.startTime).toBe(1.5);
    expect(c.endTime).toBe(4.0);
    for (const [i1] of slices) expect(i1).toBeGreaterThanOrEqual(0);
    expect(await c.getDataIndexForTime(2.4)).toBe(1);
    expect(await c.getDataIndexForTime(100)).toBe(2);
  });

  it("initializes a series with a single sample", async () => {
    timestamps = [7];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await c.initialize();
    expect(c.startTime).toBe(7);
    expect(c.endTime).toBe(7);
    expect(c.estimatedSamplingFrequency).toBe(1);
    expect(await c.getDataIndexForTime(3)).toBe(0);
  });

  it("rejects an empty timestamps dataset with a clear error", async () => {
    timestamps = [];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await expect(c.initialize()).rejects.toThrow(/empty/);
  });

  it("walks back over trailing NaN timestamps for the end time", async () => {
    timestamps = [0, 1, 2, 3, NaN, NaN];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await c.initialize();
    expect(c.endTime).toBe(3);
  });

  it("finds indices when timestamps repeat", async () => {
    // Duplicate timestamps make the interpolation bracket zero width, which
    // used to produce a NaN index and an invalid slice request.
    timestamps = [0, 0, 0, 0, 5, 5, 5, 5];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await c.initialize();
    expect(c.estimatedSamplingFrequency).toBe(1 / 5);
    const i = await c.getDataIndexForTime(1);
    expect(Number.isInteger(i)).toBe(true);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(timestamps.length);
    const j = await c.getDataIndexForTime(5);
    expect(timestamps[j]).toBe(5);
  });

  it("estimates the rate from the median gap", async () => {
    timestamps = [0, 0.1, 0.2, 0.3, 0.9, 1.0];
    const c = new IrregularTimeseriesTimestampsClient("u", "/acq/ts");
    await c.initialize();
    expect(c.estimatedSamplingFrequency).toBeCloseTo(10);
  });
});
