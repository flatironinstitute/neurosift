import { describe, expect, it } from "vitest";
import { RowItem, sortRowItems } from "./sortRowItems";

const columns = ["id", "location", "quality", "depth"];
const rows: RowItem[] = [
  { id: 0, columnValues: [0, "right", "good", 120.5] },
  { id: 1, columnValues: [1, "left", "mua", 80] },
  { id: 2, columnValues: [2, "center", "good", NaN] },
  { id: 3, columnValues: [3, "left", "noise", 200] },
  { id: 4, columnValues: [4, undefined, "good", 10] },
];
const ids = (r: RowItem[]) => r.map((x) => x.id);

describe("sortRowItems", () => {
  it("returns the rows unchanged with no primary sort", () => {
    expect(sortRowItems(rows, columns, {})).toBe(rows);
  });

  it("sorts string columns lexicographically", () => {
    const asc = sortRowItems(rows, columns, {
      primary: { column: "location", ascending: true },
    });
    expect(ids(asc)).toEqual([2, 1, 3, 0, 4]);
    const desc = sortRowItems(rows, columns, {
      primary: { column: "location", ascending: false },
    });
    expect(ids(desc)).toEqual([0, 1, 3, 2, 4]);
  });

  it("sorts numeric columns numerically with NaN last", () => {
    const asc = sortRowItems(rows, columns, {
      primary: { column: "depth", ascending: true },
    });
    expect(ids(asc)).toEqual([4, 1, 0, 3, 2]);
    const desc = sortRowItems(rows, columns, {
      primary: { column: "depth", ascending: false },
    });
    expect(ids(desc)).toEqual([3, 0, 1, 4, 2]);
  });

  it("does not treat strings as NaN", () => {
    // isNaN("left") is true, which is how the old comparator broke string
    // sorts: every pair compared as "missing" and the order was arbitrary.
    const sorted = sortRowItems(rows, columns, {
      primary: { column: "quality", ascending: true },
    });
    expect(sorted.map((r) => r.columnValues[2])).toEqual([
      "good",
      "good",
      "good",
      "mua",
      "noise",
    ]);
  });

  it("applies the secondary sort within ties", () => {
    const sorted = sortRowItems(rows, columns, {
      primary: { column: "quality", ascending: true },
      secondary: { column: "depth", ascending: false },
    });
    expect(ids(sorted)).toEqual([0, 4, 2, 1, 3]);
  });

  it("puts missing values last in both directions", () => {
    const asc = sortRowItems(rows, columns, {
      primary: { column: "location", ascending: true },
    });
    expect(asc[asc.length - 1].id).toBe(4);
    const desc = sortRowItems(rows, columns, {
      primary: { column: "location", ascending: false },
    });
    expect(desc[desc.length - 1].id).toBe(4);
  });

  it("does not mutate the input", () => {
    const before = ids(rows);
    sortRowItems(rows, columns, {
      primary: { column: "depth", ascending: true },
    });
    expect(ids(rows)).toEqual(before);
  });

  it("ignores an unknown sort column", () => {
    expect(
      sortRowItems(rows, columns, {
        primary: { column: "nope", ascending: true },
      }),
    ).toBe(rows);
  });
});
