import { describe, expect, it } from "vitest";
import { cellValue, tableColumns, tableCsv } from "./dynamicTableColumns";
import type { RowItem } from "./sortRowItems";

const reference = {
  _REFERENCE: {
    path: "/general/extracellular_ephys/electrodes",
    object_id: "a",
    source: ".",
    source_object_id: "b",
  },
};

describe("cellValue", () => {
  it("keeps numbers and strings, and turns bigints into numbers", () => {
    expect(cellValue(1.5)).toBe(1.5);
    expect(cellValue("good")).toBe("good");
    expect(cellValue(BigInt(42))).toBe(42);
  });

  it("writes booleans, arrays and typed arrays as text", () => {
    expect(cellValue(true)).toBe("true");
    expect(cellValue([1, 2, 3])).toBe("[1, 2, 3]");
    expect(cellValue(new Float64Array([0.5, 1]))).toBe("[0.5, 1]");
    expect(cellValue([[1, 2], [3]])).toBe("[[1, 2], [3]]");
  });

  it("cuts arrays after 200 values", () => {
    const text = cellValue(Array.from({ length: 250 }, (_, i) => i));
    expect(text).toMatch(/^\[0, 1, .*, 199, …\]$/);
  });

  it("shows an object reference as the path it points to", () => {
    expect(cellValue(reference)).toBe(
      "/general/extracellular_ephys/electrodes",
    );
  });
});

describe("tableColumns", () => {
  const colnames = ["id", "quality", "depth", "spike_count", "electrodes"];
  const data = {
    id: [0, 1, 2],
    quality: ["good", "mua", "good"],
    depth: [120.5, NaN, 80],
    spike_count: [BigInt(10), BigInt(3), BigInt(7)],
    electrodes: [reference, reference, reference],
  };

  it("types id as code, numeric columns as numbers and the rest as text or code", () => {
    const columns = tableColumns(colnames, colnames, data);
    expect(columns.map((c) => [c.key, c.type])).toEqual([
      ["id", "code"],
      ["quality", "text"],
      ["depth", "number"],
      ["spike_count", "number"],
      ["electrodes", "code"],
    ]);
    expect(columns.every((c) => c.sortable && c.label === c.key)).toBe(true);
  });

  it("reads each column's value from the row by the column's place in colnames", () => {
    const row: RowItem = {
      id: 1,
      columnValues: [1, "mua", NaN, BigInt(3), reference],
    };
    const columns = tableColumns(colnames, ["depth", "spike_count"], data);
    expect(columns.map((c) => c.value(row))).toEqual([NaN, 3]);
  });
});

describe("tableCsv", () => {
  it("quotes strings, keeps numbers and leaves other values empty", () => {
    const rows: RowItem[] = [
      { id: 0, columnValues: [0, 'say "hi"', 1.5, [1, 2]] },
      { id: 1, columnValues: [1, undefined, NaN, [3]] },
    ];
    expect(
      tableCsv(["id", "note", "depth", "list"], ["id", "note", "depth"], rows),
    ).toBe('id,note,depth\n0,"say ""hi""",1.5\n1,,NaN');
  });
});
