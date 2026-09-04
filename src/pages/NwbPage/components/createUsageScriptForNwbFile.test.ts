import { describe, expect, it, vi } from "vitest";

// A small in-memory NWB file: a processing module that holds a Units table
// alongside a time series, plus the top-level /units table.
type FakeDataset = {
  shape: number[];
  dtype: string;
  attrs: { [key: string]: unknown };
  value?: unknown;
};
type FakeGroup = {
  attrs: { [key: string]: unknown };
  datasets: string[];
  subgroups: string[];
};
const groups: { [path: string]: FakeGroup } = {
  "/acquisition": { attrs: {}, datasets: [], subgroups: ["raw-series 1"] },
  "/acquisition/raw-series 1": {
    attrs: { neurodata_type: "TimeSeries", description: "raw" },
    datasets: ["data", "timestamps"],
    subgroups: [],
  },
  "/processing": { attrs: {}, datasets: [], subgroups: ["ecephys"] },
  "/processing/ecephys": {
    attrs: { neurodata_type: "ProcessingModule", description: "" },
    datasets: [],
    subgroups: ["units", "lfp.filtered"],
  },
  "/processing/ecephys/units": {
    attrs: {
      neurodata_type: "Units",
      description: "sorted",
      colnames: ["spike_times", "quality"],
    },
    datasets: ["id", "spike_times", "spike_times_index", "quality"],
    subgroups: [],
  },
  "/processing/ecephys/lfp.filtered": {
    attrs: { neurodata_type: "TimeSeries", description: "lfp" },
    datasets: ["data", "starting_time"],
    subgroups: [],
  },
  "/units": {
    attrs: { neurodata_type: "Units", colnames: ["spike_times"] },
    datasets: ["id", "spike_times", "spike_times_index"],
    subgroups: [],
  },
};
const datasets: { [path: string]: FakeDataset } = {
  "/acquisition/raw-series 1/data": {
    shape: [100, 4],
    dtype: "<f4",
    attrs: {},
  },
  "/acquisition/raw-series 1/timestamps": {
    shape: [100],
    dtype: "<f8",
    attrs: {},
  },
  "/processing/ecephys/units/id": {
    shape: [3],
    dtype: "<i4",
    attrs: {},
    value: [0, 1, 2],
  },
  "/processing/ecephys/units/spike_times": {
    shape: [30],
    dtype: "<f8",
    attrs: {},
  },
  "/processing/ecephys/units/spike_times_index": {
    shape: [3],
    dtype: "<i4",
    attrs: {},
  },
  "/processing/ecephys/units/quality": {
    shape: [3],
    dtype: "|O",
    attrs: { description: "sorting quality" },
  },
  "/processing/ecephys/lfp.filtered/data": {
    shape: [100, 4],
    dtype: "<f4",
    attrs: {},
  },
  "/processing/ecephys/lfp.filtered/starting_time": {
    shape: [],
    dtype: "<f8",
    attrs: { rate: 250 },
    value: 0,
  },
  "/units/id": { shape: [2], dtype: "<i4", attrs: {}, value: [0, 1] },
  "/units/spike_times": { shape: [20], dtype: "<f8", attrs: {} },
  "/units/spike_times_index": { shape: [2], dtype: "<i4", attrs: {} },
};

const datasetInfo = (path: string) => {
  const d = datasets[path];
  if (!d) return undefined;
  return {
    name: path.split("/").pop()!,
    path,
    shape: d.shape,
    dtype: d.dtype,
    attrs: d.attrs,
  };
};

vi.mock("@hdf5Interface", () => ({
  getHdf5Group: async (_url: string, path: string) => {
    const g = groups[path];
    if (!g) return undefined;
    return {
      path,
      attrs: g.attrs,
      datasets: g.datasets.map((n) => datasetInfo(`${path}/${n}`)),
      subgroups: g.subgroups.map((n) => ({
        name: n,
        path: `${path}/${n}`,
        attrs: groups[`${path}/${n}`]?.attrs ?? {},
      })),
    };
  },
  getHdf5Dataset: async (_url: string, path: string) => datasetInfo(path),
  getHdf5DatasetData: async (_url: string, path: string) => {
    const d = datasets[path];
    if (!d) return undefined;
    return d.value;
  },
}));

const { default: createUsageScriptForNwbFile, makeValidVariableName } =
  await import("./createUsageScriptForNwbFile");

describe("createUsageScriptForNwbFile", () => {
  it("emits the units section of a processing module in place", async () => {
    const script = await createUsageScriptForNwbFile("u");
    const lines = script.split("\n");
    const unitsVar = lines.findIndex((l) =>
      l.startsWith('units_ = nwb.processing["ecephys"]["units"]'),
    );
    const unitsSection = lines.findIndex(
      (l) => l === 'units = nwb.processing["ecephys"]["units"] # (Units)',
    );
    const nextObject = lines.findIndex((l) =>
      l.startsWith('lfp_filtered = nwb.processing["ecephys"]["lfp.filtered"]'),
    );
    const topLevelUnits = lines.findIndex(
      (l) => l === "units = nwb.units # (Units)",
    );
    expect(unitsVar).toBeGreaterThan(-1);
    expect(unitsSection).toBeGreaterThan(unitsVar);
    expect(nextObject).toBeGreaterThan(unitsSection);
    expect(topLevelUnits).toBeGreaterThan(nextObject);
    // The column lines belong to the module's table, not the top-level one.
    const qualityLine = lines.findIndex((l) =>
      l.startsWith('units["quality"].data'),
    );
    expect(qualityLine).toBeGreaterThan(unitsSection);
    expect(qualityLine).toBeLessThan(nextObject);
    expect(script).toContain(
      'unit_ids = units["id"].data # len(unit_ids) == 3 (number of units is 3)',
    );
  });

  it("uses valid Python identifiers for object variables", async () => {
    const script = await createUsageScriptForNwbFile("u");
    expect(script).toContain(
      'raw_series_1 = nwb.acquisition["raw-series 1"] # (TimeSeries) raw',
    );
    expect(script).toContain(
      "raw_series_1.data # (h5py.Dataset) shape [100, 4]",
    );
    expect(script).toContain(
      'lfp_filtered = nwb.processing["ecephys"]["lfp.filtered"] # (TimeSeries) lfp',
    );
    expect(script).toContain("lfp_filtered.rate # 250 Hz");
    // No line may start with an identifier that Python would reject.
    for (const line of script.split("\n")) {
      const m = /^([^\s=#.[]+)\s*=/.exec(line);
      if (m) expect(m[1]).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
    }
  });
});

describe("makeValidVariableName", () => {
  it("replaces characters that are not valid in identifiers", () => {
    expect(makeValidVariableName("raw-series 1")).toBe("raw_series_1");
    expect(makeValidVariableName("roi.responses")).toBe("roi_responses");
    expect(makeValidVariableName("Fluorescence (dF/F)")).toBe(
      "Fluorescence__dF_F_",
    );
  });
  it("handles leading digits, keywords, and empty names", () => {
    expect(makeValidVariableName("2p_series")).toBe("_2p_series");
    expect(makeValidVariableName("class")).toBe("class_");
    expect(makeValidVariableName("units")).toBe("units_");
    expect(makeValidVariableName("")).toBe("_");
  });
  it("leaves valid names alone", () => {
    expect(makeValidVariableName("ElectricalSeries_1")).toBe(
      "ElectricalSeries_1",
    );
  });
});
