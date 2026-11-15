import { describe, expect, it } from "vitest";
import { parseTsv, sortRows, tsvColumns } from "./tsvTable";

const table = parseTsv(
  "participant_id\tsex\tage\nsub-01\tF\t26\nsub-02\tM\tn/a\nsub-03\tM\t9\n",
);

describe("tsvTable", () => {
  it("shows IDs in the code face and numbers as numbers, with n/a as missing", () => {
    if ("error" in table) throw new Error(table.error);
    const columns = tsvColumns(table);
    expect(columns.map((c) => c.type)).toEqual(["code", "text", "number"]);
    expect(table.rows.map((row) => columns[2].value(row))).toEqual([
      26,
      null,
      9,
    ]);
  });

  it("sorts numbers by value and keeps the file's order without a sort", () => {
    if ("error" in table) throw new Error(table.error);
    const ages = (rows: typeof table.rows) => rows.map((r) => r.cells[2]);
    expect(ages(sortRows(table.rows))).toEqual(["26", "n/a", "9"]);
    expect(
      ages(sortRows(table.rows, { key: "0", direction: "descending" })),
    ).toEqual(["9", "n/a", "26"]);
  });

  it("says when rows have a different number of columns", () => {
    expect(parseTsv("a\tb\n1\n")).toEqual({
      error: "Malformed TSV: Inconsistent number of columns",
    });
  });
});
