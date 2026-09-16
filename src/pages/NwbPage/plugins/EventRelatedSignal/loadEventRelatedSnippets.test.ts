import { describe, expect, it } from "vitest";
import { plottedRowIndexes } from "./loadEventRelatedSnippets";

describe("plottedRowIndexes", () => {
  it("skips rows whose alignment time is not finite", () => {
    // A `reward_start_time` column: NaN on every unrewarded trial.
    const alignTimes = [NaN, 1822.143, 1841.201, NaN, 1865.512];
    expect(plottedRowIndexes(alignTimes, 100)).toEqual([1, 2, 4]);
  });

  it("applies the cap to the plottable rows, not to the raw rows", () => {
    const alignTimes = [NaN, NaN, 1, 2, 3];
    expect(plottedRowIndexes(alignTimes, 2)).toEqual([2, 3]);
  });

  it("returns every row when all alignment times are finite", () => {
    expect(plottedRowIndexes([0, 1, 2], 10)).toEqual([0, 1, 2]);
  });
});
