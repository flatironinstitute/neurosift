// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// A file with an ElectricalSeries (no subgroups) and a TwoPhotonSeries whose
// imaging_plane link the reader lists as a subgroup.
type G = {
  attrs: { [k: string]: unknown };
  subgroups: string[];
  datasets: {
    name: string;
    shape: number[];
    attrs?: { [k: string]: unknown };
  }[];
};
const groups: { [path: string]: G } = {
  "/": { attrs: {}, subgroups: ["acquisition", "general"], datasets: [] },
  "/general": { attrs: {}, subgroups: [], datasets: [] },
  "/acquisition": { attrs: {}, subgroups: ["es", "tps"], datasets: [] },
  "/acquisition/es": {
    attrs: { neurodata_type: "ElectricalSeries" },
    subgroups: [],
    datasets: [
      { name: "data", shape: [100, 4] },
      { name: "timestamps", shape: [100] },
    ],
  },
  "/acquisition/tps": {
    attrs: { neurodata_type: "TwoPhotonSeries" },
    subgroups: ["imaging_plane"],
    datasets: [
      { name: "data", shape: [50, 8, 8] },
      { name: "starting_time", shape: [], attrs: { rate: 5 } },
    ],
  },
  "/acquisition/tps/imaging_plane": {
    attrs: { neurodata_type: "ImagingPlane" },
    subgroups: [],
    datasets: [],
  },
};
const visited: string[] = [];

vi.mock("./hdf5Interface", () => ({
  getHdf5Group: async (_url: string, path: string) => {
    const g = groups[path];
    if (!g) return undefined;
    visited.push(path);
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
        attrs: d.attrs ?? {},
      })),
    };
  },
  getHdf5DatasetData: async (
    _url: string,
    path: string,
    o: { slice?: [number, number][] },
  ) => {
    if (path === "/acquisition/es/timestamps") {
      const [i] = o.slice![0];
      return Float64Array.from([i * 0.01]);
    }
    if (path === "/acquisition/tps/starting_time") return 2;
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
    {
      neurodata_type_def: "ElectricalSeries",
      neurodata_type_inc: "TimeSeries",
    },
    { neurodata_type_def: "ImageSeries", neurodata_type_inc: "TimeSeries" },
    {
      neurodata_type_def: "TwoPhotonSeries",
      neurodata_type_inc: "ImageSeries",
    },
    { neurodata_type_def: "ImagingPlane", neurodata_type_inc: "NWBContainer" },
    {
      neurodata_type_def: "ProcessingModule",
      neurodata_type_inc: "NWBContainer",
    },
  ],
};
vi.mock("./SpecificationsView/SetupNwbFileSpecificationsProvider", () => ({
  useNwbFileSpecifications: () => specs,
}));

const { default: TimeseriesAlignmentView } =
  await import("./TimeseriesAlignmentView");

describe("TimeseriesAlignmentView", () => {
  it("lists series that carry links as subgroups", async () => {
    const { container } = render(
      <TimeseriesAlignmentView
        nwbUrl="u"
        width={600}
        isExpanded={true}
        onOpenTimeseriesItem={() => {}}
      />,
    );
    await waitFor(() => {
      expect(
        container.querySelectorAll('[title="ElectricalSeries"]'),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll('[title="TwoPhotonSeries"]'),
      ).toHaveLength(1);
    });
    // The link target is metadata, not a place to look for more series.
    expect(visited).not.toContain("/acquisition/tps/imaging_plane");
    expect(visited).not.toContain("/general");
  });
});
