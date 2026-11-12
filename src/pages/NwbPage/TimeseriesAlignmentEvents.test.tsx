// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// An EventsTable from ndx-events, a plain DynamicTable that also has a
// timestamp column, and a TimeSeries to set the overall span.
type G = {
  attrs: { [k: string]: unknown };
  subgroups: string[];
  datasets: { name: string; shape: number[] }[];
};
const groups: { [path: string]: G } = {
  "/": { attrs: {}, subgroups: ["acquisition"], datasets: [] },
  "/acquisition": {
    attrs: {},
    subgroups: ["eventLog", "params", "ts"],
    datasets: [],
  },
  "/acquisition/eventLog": {
    attrs: { neurodata_type: "EventsTable" },
    subgroups: [],
    datasets: [
      { name: "id", shape: [4] },
      { name: "timestamp", shape: [4] },
      { name: "event_code", shape: [4] },
    ],
  },
  "/acquisition/params": {
    attrs: { neurodata_type: "DynamicTable" },
    subgroups: [],
    datasets: [{ name: "timestamp", shape: [2] }],
  },
  "/acquisition/ts": {
    attrs: { neurodata_type: "TimeSeries" },
    subgroups: [],
    datasets: [
      { name: "data", shape: [11] },
      { name: "timestamps", shape: [11] },
    ],
  },
};
const eventTimes = [10, 20, 20.5, 40];
const reads: { path: string; slice?: [number, number][] }[] = [];

vi.mock("./hdf5Interface", () => ({
  getHdf5Group: async (_url: string, path: string) => {
    const g = groups[path];
    if (!g) return undefined;
    const prefix = path === "/" ? "" : path;
    return {
      path,
      attrs: g.attrs,
      subgroups: g.subgroups.map((n) => ({
        name: n,
        path: `${prefix}/${n}`,
        attrs: groups[`${prefix}/${n}`]?.attrs ?? {},
      })),
      datasets: g.datasets.map((d) => ({
        name: d.name,
        path: `${prefix}/${d.name}`,
        shape: d.shape,
        dtype: "<f8",
        attrs: {},
      })),
    };
  },
  getHdf5DatasetData: async (
    _url: string,
    path: string,
    o: { slice?: [number, number][] },
  ) => {
    reads.push({ path, slice: o.slice });
    if (path === "/acquisition/ts/timestamps") {
      const [i] = o.slice![0];
      return Float64Array.from([i * 10]);
    }
    if (path === "/acquisition/eventLog/timestamp") {
      if (!o.slice) return Float64Array.from(eventTimes);
      const [i, j] = o.slice[0];
      return Float64Array.from(eventTimes.slice(i, j));
    }
    return undefined;
  },
}));

const specs = {
  subgroups: [],
  allNamespaces: [],
  allDatasets: [],
  allGroups: [
    {
      neurodata_type_def: "NWBDataInterface",
      neurodata_type_inc: "NWBContainer",
    },
    {
      neurodata_type_def: "TimeSeries",
      neurodata_type_inc: "NWBDataInterface",
    },
    { neurodata_type_def: "DynamicTable", neurodata_type_inc: "Container" },
    { neurodata_type_def: "EventsTable", neurodata_type_inc: "DynamicTable" },
  ],
};
vi.mock("./SpecificationsView/SetupNwbFileSpecificationsProvider", () => ({
  useNwbFileSpecifications: () => specs,
}));

class FakeResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe() {
    this.callback(
      [{ contentRect: { width: 100, height: 8 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
  disconnect() {}
  unobserve() {}
}

// The library keeps one observer per set of options across renders, so these stay between tests.
const observers: FakeIntersectionObserver[] = [];
class FakeIntersectionObserver {
  elements: Element[] = [];
  thresholds = [0];
  constructor(private callback: IntersectionObserverCallback) {
    observers.push(this);
  }
  observe(element: Element) {
    this.elements.push(element);
  }
  unobserve() {}
  disconnect() {}
  enter() {
    this.callback(
      this.elements.map(
        (target) =>
          ({
            target,
            isIntersecting: true,
            intersectionRatio: 1,
          }) as unknown as IntersectionObserverEntry,
      ),
      this as unknown as IntersectionObserver,
    );
  }
}
const scrollAllIntoView = () => observers.forEach((o) => o.enter());

const { default: TimeseriesAlignmentView } =
  await import("./TimeseriesAlignmentView");

const fullReads = () =>
  reads.filter((r) => r.path === "/acquisition/eventLog/timestamp" && !r.slice);

describe("TimeseriesAlignmentView event tables", () => {
  beforeEach(() => {
    reads.length = 0;
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const renderView = () =>
    render(
      <TimeseriesAlignmentView
        nwbUrl="u"
        width={600}
        isExpanded={true}
        onOpenTimeseriesItem={() => {}}
      />,
    );

  it("lists an EventsTable with its count and first to last event", async () => {
    const { container } = renderView();
    await waitFor(() =>
      expect(container.querySelectorAll('[title="EventsTable"]')).toHaveLength(
        1,
      ),
    );
    const row = container.querySelector('[title="EventsTable"]')!;
    expect(row.textContent).toContain("/acquisition/eventLog");
    expect(row.textContent).toContain("EventsTable · 4 events · 10.0 – 40.0 s");
    expect(row.querySelector(".alignment-bar--range")).not.toBeNull();
  });

  it("leaves out tables that are not event tables", async () => {
    const { container } = renderView();
    await waitFor(() =>
      expect(container.querySelectorAll('[title="TimeSeries"]')).toHaveLength(
        1,
      ),
    );
    expect(container.textContent).not.toContain("/acquisition/params");
  });

  it("reads the event times only once the row is in view, then ticks each column", async () => {
    const { container } = renderView();
    await waitFor(() =>
      expect(container.querySelector('[title="EventsTable"]')).not.toBeNull(),
    );
    // Only the first and last time are read for the bar.
    expect(fullReads()).toHaveLength(0);
    act(() => scrollAllIntoView());
    await waitFor(() =>
      expect(container.querySelector(".alignment-ticks path")).not.toBeNull(),
    );
    expect(fullReads()).toHaveLength(1);
    // The span is 0 to 100 s over 100 px; 20 and 20.5 s share a column.
    expect(
      container.querySelector(".alignment-ticks path")!.getAttribute("d"),
    ).toBe("M10.5 0v8M20.5 0v8M40.5 0v8");
  });
});
