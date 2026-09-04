// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ProvideTimeseriesSelection,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";

// A deferred promise so the test decides when each load resolves.
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

type LoadResult = { timestamps: number[]; data: number[][] };
const loads: {
  tStart: number;
  tEnd: number;
  d: ReturnType<typeof deferred<LoadResult>>;
}[] = [];

const groups: { [path: string]: object } = {
  "/a": { path: "/a", datasets: [], subgroups: [], attrs: {} },
  "/b": { path: "/b", datasets: [], subgroups: [], attrs: {} },
};
const creates: { path: string; d: ReturnType<typeof deferred<unknown>> }[] = [];

const makeClient = (path: string) => ({
  path,
  startTime: 0,
  endTime: 100,
  duration: 100,
  samplingFrequency: 10,
  numChannels: 2,
  numSamples: 1000,
  chunkSizeSec: 1,
  getDataForTimeRange: (tStart: number, tEnd: number) => {
    const d = deferred<LoadResult>();
    loads.push({ tStart, tEnd, d });
    return d.promise;
  },
});

vi.mock("@hdf5Interface", () => ({
  useHdf5Group: (_url: string, path: string) => groups[path],
}));

vi.mock("./TimeseriesClient", () => ({
  ChunkedTimeseriesClient: {
    create: (_url: string, group: { path: string }) => {
      const d = deferred<unknown>();
      creates.push({ path: group.path, d });
      return d.promise;
    },
  },
}));

const { useTimeseriesClient, useTimeseriesData } = await import("./hooks");

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ProvideTimeseriesSelection>{children}</ProvideTimeseriesSelection>
);

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe("useTimeseriesData", () => {
  beforeEach(() => {
    loads.length = 0;
    creates.length = 0;
  });

  it("ignores a stale load that resolves after a newer one", async () => {
    const { result } = renderHook(
      () => ({
        data: useTimeseriesData("u", "/a"),
        selection: useTimeseriesSelection(),
      }),
      { wrapper },
    );
    await flush();
    await act(async () => {
      creates[0].d.resolve(makeClient("/a"));
    });
    await waitFor(() =>
      expect(result.current.data.timeseriesClient).toBeTruthy(),
    );
    // The initial visible range triggers the first load.
    await waitFor(() => expect(loads.length).toBe(1));

    // Two quick zooms: each starts a new load before the previous resolves.
    await act(async () => {
      result.current.selection.setVisibleTimeRange(10.2, 11.5);
    });
    await waitFor(() => expect(loads.length).toBe(2));
    await act(async () => {
      result.current.selection.setVisibleTimeRange(20.2, 21.5);
    });
    await waitFor(() => expect(loads.length).toBe(3));
    expect(loads[1]).toMatchObject({ tStart: 10, tEnd: 12 });
    expect(loads[2]).toMatchObject({ tStart: 20, tEnd: 22 });

    // The newest load resolves first, then the superseded ones straggle in.
    const newest = { timestamps: [20, 21], data: [[200, 210]] };
    const stale = { timestamps: [10, 11], data: [[100, 110]] };
    const initial = { timestamps: [0], data: [[0]] };
    await act(async () => {
      loads[2].d.resolve(newest);
    });
    await waitFor(() =>
      expect(result.current.data.loadedTimestamps).toEqual([20, 21]),
    );
    expect(result.current.data.isLoading).toBe(false);

    await act(async () => {
      loads[1].d.resolve(stale);
      loads[0].d.resolve(initial);
    });
    await flush();
    expect(result.current.data.loadedTimestamps).toEqual([20, 21]);
    expect(result.current.data.loadedData).toEqual([[200, 210]]);
    expect(result.current.data.isLoading).toBe(false);
  });

  it("ignores an error from a superseded load", async () => {
    const { result } = renderHook(
      () => ({
        data: useTimeseriesData("u", "/a"),
        selection: useTimeseriesSelection(),
      }),
      { wrapper },
    );
    await flush();
    await act(async () => {
      creates[0].d.resolve(makeClient("/a"));
    });
    await waitFor(() => expect(loads.length).toBe(1));
    await act(async () => {
      result.current.selection.setVisibleTimeRange(10.2, 11.5);
    });
    await waitFor(() => expect(loads.length).toBe(2));
    await act(async () => {
      loads[1].d.resolve({ timestamps: [10], data: [[1]] });
    });
    await waitFor(() =>
      expect(result.current.data.loadedTimestamps).toEqual([10]),
    );
    await act(async () => {
      loads[0].d.reject(new Error("old request failed"));
    });
    await flush();
    expect(result.current.data.error).toBeUndefined();
    expect(result.current.data.loadedTimestamps).toEqual([10]);
  });
});

describe("useTimeseriesClient", () => {
  beforeEach(() => {
    loads.length = 0;
    creates.length = 0;
  });

  it("does not adopt a client for a path that is no longer shown", async () => {
    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useTimeseriesClient("u", path),
      { wrapper, initialProps: { path: "/a" } },
    );
    await flush();
    expect(creates.map((c) => c.path)).toEqual(["/a"]);
    rerender({ path: "/b" });
    await flush();
    expect(creates.map((c) => c.path)).toEqual(["/a", "/b"]);

    const clientB = makeClient("/b");
    const clientA = makeClient("/a");
    await act(async () => {
      creates[1].d.resolve(clientB);
    });
    await waitFor(() => expect(result.current.timeseriesClient).toBe(clientB));
    await act(async () => {
      creates[0].d.resolve(clientA);
    });
    await flush();
    expect(result.current.timeseriesClient).toBe(clientB);
  });

  it("clears the previous client while the next one is created", async () => {
    const { result, rerender } = renderHook(
      ({ path }: { path: string }) => useTimeseriesClient("u", path),
      { wrapper, initialProps: { path: "/a" } },
    );
    await flush();
    await act(async () => {
      creates[0].d.resolve(makeClient("/a"));
    });
    await waitFor(() => expect(result.current.timeseriesClient).toBeTruthy());
    rerender({ path: "/b" });
    await flush();
    expect(result.current.timeseriesClient).toBeUndefined();
  });
});
