import { beforeEach, describe, expect, it, vi } from "vitest";

// Units table with two units whose spike times are stored ragged, the way
// pynwb writes spike_times and spike_times_index.
const unitSpikes: number[][] = [
  [0.1, 0.5, 0.99, 1.0, 1.5, 2.9],
  [0.2, 1.2, 1.95, 2.0, 2.05],
];
const spikeTimes = unitSpikes.flat();
const spikeTimesIndex = unitSpikes.reduce<number[]>((acc, u) => {
  acc.push((acc[acc.length - 1] ?? 0) + u.length);
  return acc;
}, []);
const requests: [number, number][] = [];

vi.mock("@hdf5Interface", () => ({
  getHdf5Group: async (_url: string, path: string) => ({
    path,
    subgroups: [],
    datasets: ["id", "spike_times", "spike_times_index"].map((name) => ({
      name,
      path: `${path}/${name}`,
    })),
    attrs: {},
  }),
  getHdf5DatasetData: async (
    _url: string,
    path: string,
    o: { slice?: [number, number][] },
  ) => {
    if (path.endsWith("/id")) return Int32Array.from([0, 1]);
    if (path.endsWith("/spike_times_index"))
      return Int32Array.from(spikeTimesIndex);
    if (path.endsWith("/spike_times")) {
      const [i1, i2] = o.slice?.[0] ?? [0, spikeTimes.length];
      requests.push([i1, i2]);
      return Float64Array.from(spikeTimes.slice(i1, i2));
    }
    return undefined;
  },
}));

const { ChunkedDirectSpikeTrainsClient } =
  await import("./DirectSpikeTrainsClient");

const inRange = (unit: number, t1: number, t2: number) =>
  unitSpikes[unit].filter((t) => t >= t1 && t < t2);

describe("ChunkedDirectSpikeTrainsClient", () => {
  beforeEach(() => {
    requests.length = 0;
  });

  it("returns every spike of a unit including the last one", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    const spikes = await client.getUnitSpikeTrainForTimeRange(0, 0, 3);
    expect(spikes).toEqual(unitSpikes[0]);
  });

  it("keeps spikes that are nearest to but below a chunk boundary", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    // Unit 0 has spikes at 1.5 and 2.9 that a loader using the nearest index
    // as an exclusive bound never returns.
    expect(await client.getUnitSpikeTrainForTimeRange(0, 1, 2)).toEqual(
      inRange(0, 1, 2),
    );
    expect(await client.getUnitSpikeTrainForTimeRange(0, 2, 3)).toEqual(
      inRange(0, 2, 3),
    );
    expect(await client.getUnitSpikeTrainForTimeRange(1, 1, 2)).toEqual(
      inRange(1, 1, 2),
    );
  });

  it("does not duplicate spikes on chunk boundaries", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    const spikes = await client.getUnitSpikeTrainForTimeRange(1, 0.5, 2.5);
    expect(spikes).toEqual(inRange(1, 0.5, 2.5));
    expect(new Set(spikes).size).toBe(spikes.length);
  });

  it("respects the requested range within a chunk", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    expect(await client.getUnitSpikeTrainForTimeRange(0, 0.3, 0.995)).toEqual([
      0.5, 0.99,
    ]);
    expect(await client.getUnitSpikeTrainForTimeRange(0, 0.99, 1.0)).toEqual([
      0.99,
    ]);
  });

  it("returns nothing for an empty range", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    expect(await client.getUnitSpikeTrainForTimeRange(0, 0.6, 0.9)).toEqual([]);
  });

  it("only reads the unit's own slice of spike_times", async () => {
    const client = await ChunkedDirectSpikeTrainsClient.create(
      "u",
      "/units",
      1,
    );
    requests.length = 0;
    await client.getUnitSpikeTrainForTimeRange(1, 0, 3);
    const [lo, hi] = [spikeTimesIndex[0], spikeTimesIndex[1]];
    for (const [i1, i2] of requests) {
      expect(i1).toBeGreaterThanOrEqual(lo);
      expect(i2).toBeLessThanOrEqual(hi);
    }
  });
});
