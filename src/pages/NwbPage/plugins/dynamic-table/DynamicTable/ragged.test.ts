import { describe, expect, it } from "vitest";
import {
  cellSummary,
  csvLeftOut,
  csvList,
  detailSummary,
  detailText,
  findRaggedColumns,
  formatNumber,
  fullText,
  leafRanges,
  listCounts,
  previewBatches,
  previewText,
  rowRange,
  rowValues,
  type TableDataset,
} from "./ragged";

const ref = (path: string) => ({ _REFERENCE: { path } });
const index = (name: string, target: string): TableDataset => ({
  name,
  shape: [3],
  attrs: { neurodata_type: "VectorIndex", target: ref(`/units/${target}`) },
});
const data = (name: string, shape: number[]): TableDataset => ({
  name,
  shape,
  attrs: { neurodata_type: "VectorData" },
});

// The units table of Dandiset 000673: waveforms_index points at waveforms_index_index, which points at waveforms.
const UNITS: TableDataset[] = [
  data("id", [3]),
  data("spike_times", [10]),
  index("spike_times_index", "spike_times"),
  data("waveforms", [10, 256]),
  index("waveforms_index", "waveforms_index_index"),
  index("waveforms_index_index", "waveforms"),
  data("obs_intervals", [4, 2]),
  index("obs_intervals_index", "obs_intervals"),
  data("quality", [3]),
];

describe("findRaggedColumns", () => {
  it("follows each index to its data, outermost index first", () => {
    const found = findRaggedColumns(UNITS, [
      "quality",
      "waveforms",
      "spike_times",
    ]);
    expect(found.map((c) => [c.name, c.indexes, c.listed])).toEqual([
      ["waveforms", ["waveforms_index", "waveforms_index_index"], true],
      ["spike_times", ["spike_times_index"], true],
      ["obs_intervals", ["obs_intervals_index"], false],
    ]);
    expect(found[0].shape).toEqual([10, 256]);
  });

  it("puts columns missing from colnames after the listed ones", () => {
    const found = findRaggedColumns(UNITS, ["obs_intervals"]);
    expect(found.map((c) => c.name)).toEqual([
      "obs_intervals",
      "spike_times",
      "waveforms",
    ]);
    expect(found.map((c) => c.listed)).toEqual([true, false, false]);
  });

  it("falls back to the name without _index when the target can't be read", () => {
    const found = findRaggedColumns(
      [
        data("tags", [4]),
        {
          name: "tags_index",
          shape: [2],
          attrs: { neurodata_type: "VectorIndex" },
        },
      ],
      ["tags"],
    );
    expect(found.map((c) => c.name)).toEqual(["tags"]);
  });

  it("skips an index whose data is missing", () => {
    expect(findRaggedColumns([index("a_index", "a")], [])).toEqual([]);
  });
});

describe("index decoding", () => {
  const spikeIndex = new Float64Array([3, 3, 7]);

  it("turns end offsets into each row's range, with empty rows", () => {
    expect(rowRange(spikeIndex, 0)).toEqual([0, 3]);
    expect(rowRange(spikeIndex, 1)).toEqual([3, 3]);
    expect(rowRange(spikeIndex, 2)).toEqual([3, 7]);
    expect(listCounts(spikeIndex)).toEqual([3, 0, 4]);
  });

  it("decodes an index of an index into the inner lists of a row", () => {
    const outer = [1, 3, 3];
    const inner = [2, 5, 9];
    expect(leafRanges([outer], 1)).toEqual([[1, 3]]);
    expect(leafRanges([outer, inner], 0)).toEqual([[0, 2]]);
    expect(leafRanges([outer, inner], 1)).toEqual([
      [2, 5],
      [5, 9],
    ]);
    expect(leafRanges([outer, inner], 2)).toEqual([]);
  });

  it("splits the flat data read for a row into values, arrays and nested lists", () => {
    expect(rowValues([0.5, 1, 2], 3, [[3, 6]], [10], false)).toEqual([
      0.5, 1, 2,
    ]);
    expect(rowValues([1, 2, 3, 4], 2, [[2, 4]], [5, 2], false)).toEqual([
      [1, 2],
      [3, 4],
    ]);
    expect(
      rowValues(
        [1, 2, 3, 4, 5],
        2,
        [
          [2, 4],
          [4, 7],
        ],
        [9],
        true,
      ),
    ).toEqual([
      [1, 2],
      [3, 4, 5],
    ]);
  });
});

describe("cell text", () => {
  const spikes = findRaggedColumns(UNITS, ["spike_times"])[0];
  const waveforms = findRaggedColumns(UNITS, ["waveforms"])[0];
  const obs = findRaggedColumns(UNITS, ["obs_intervals"])[0];

  it("shows the count, and says when a row is empty", () => {
    expect(cellSummary(spikes, [[1652, 1652]], 0)).toEqual({
      count: "1,652",
      needsValues: true,
    });
    expect(cellSummary(spikes, [[1652, 1652]], 1)).toEqual({
      count: "0 values",
      needsValues: false,
    });
  });

  it("shows arrays and nested lists by their shape, naming the lists only when there are several", () => {
    expect(cellSummary(obs, [[2, 4]], 0)).toEqual({
      count: "2",
      values: "× 2",
      needsValues: false,
    });
    expect(
      cellSummary(
        waveforms,
        [
          [1, 3],
          [1652, 2000, 2382],
        ],
        1,
      ),
    ).toEqual({
      count: "2 lists · 730 × 256",
      needsValues: false,
    });
    expect(cellSummary(waveforms, [[1], [1652]], 0).count).toBe("1,652 × 256");
  });

  it("writes the detail heading with the unit when the file gives one", () => {
    expect(detailSummary(spikes, [[1652]], 0)).toBe("1,652 values");
    expect(detailSummary(spikes, [[1]], 0, "seconds")).toBe(
      "1 value, in seconds",
    );
    expect(detailSummary(waveforms, [[1], [1652]], 0, "microvolts")).toBe(
      "1,652 × 256 values, in microvolts",
    );
    expect(detailSummary(waveforms, [[3], [1, 2, 5]], 0)).toBe(
      "3 lists · 5 × 256 values",
    );
  });

  it("rounds numbers for reading without thousands commas", () => {
    expect(formatNumber(0.1793905, 2)).toBe("0.18");
    expect(formatNumber(0.1793905, 3)).toBe("0.179");
    expect(formatNumber(1375.27443225, 3)).toBe("1375.274");
    expect(formatNumber(0.0001234, 2)).toBe("0.00012");
    expect(formatNumber(1652, 2)).toBe("1652");
    expect(formatNumber(NaN, 2)).toBe("NaN");
    expect(previewText([0.1793905, 0.315953, BigInt(4), "a", [1.234, 2]])).toBe(
      "0.18, 0.32, 4, a, [1.23, 2]",
    );
  });
});

describe("first N values", () => {
  const values = Array.from({ length: 1652 }, (_, i) => i + 0.5);

  it("lists the first 30, how many more, and the last", () => {
    const text = detailText(values);
    expect(text.startsWith("0.5, 1.5, 2.5")).toBe(true);
    expect(text).toContain("29.5, … 1,621 more … 1651.5");
    expect(text.split(", ")).toHaveLength(31);
  });

  it("lists everything when the list is short or Show all is on", () => {
    expect(detailText(values.slice(0, 31))).not.toContain("more");
    expect(detailText(values, Infinity).split(", ")).toHaveLength(1652);
  });

  it("cuts each array value after eight values", () => {
    const rows = [Array.from({ length: 256 }, (_, i) => i)];
    expect(detailText(rows)).toBe("[0, 1, 2, 3, 4, 5, 6, 7, …]");
  });
});

describe("copy and CSV", () => {
  it("copies every value at full precision", () => {
    expect(fullText([0.1793905, 1375.27443225])).toBe(
      "0.1793905, 1375.27443225",
    );
    expect(fullText([[1, 2], [3]])).toBe("[1, 2], [3]");
  });

  it("writes the full list in one quoted field, separated by semicolons", () => {
    expect(csvList([0.1793905, 0.315953, 1375.27443225])).toBe(
      '"0.1793905; 0.315953; 1375.27443225"',
    );
    expect(csvList([[1, 2], [3]])).toBe('"[1; 2]; [3]"');
    expect(csvList(['say "hi"', "x"])).toBe('"say ""hi""; x"');
    expect(csvList([])).toBe('""');
  });
});

describe("previewBatches", () => {
  it("reads nearby rows' first values in one read, and far rows apart", () => {
    const index = [3, 10, 10, 2_000_000, 2_000_020];
    expect(previewBatches(index, [4, 1, 0, 2], 4, 1000)).toEqual([
      { start: 0, end: 10, rows: [0, 1, 2] },
      { start: 2_000_000, end: 2_000_004, rows: [4] },
    ]);
  });
});

describe("csvLeftOut", () => {
  it("says how many values each left-out column has and points to Python", () => {
    expect(csvLeftOut([{ name: "waveforms", values: 43_098_880 }])).toBe(
      "waveforms has 43,098,880 values, too many for CSV. Load it in Python instead: see",
    );
    expect(
      csvLeftOut([
        { name: "a", values: 6_000_000 },
        { name: "b", values: 7_000_000 },
      ]),
    ).toBe(
      "a has 6,000,000 values; b has 7,000,000 values, too many for CSV. Load them in Python instead: see",
    );
  });
});
