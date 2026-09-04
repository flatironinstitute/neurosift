import { describe, expect, it } from "vitest";
import { intervalsTimeRange } from "./intervalsTimeRange";

describe("intervalsTimeRange", () => {
  it("spans from the earliest start to the latest stop", () => {
    expect(
      intervalsTimeRange(
        Float32Array.from([5, 1, 3]),
        Float32Array.from([6, 2, 4]),
      ),
    ).toEqual({ startTime: 1, endTime: 6 });
  });

  it("ignores a NaN in the first start time", () => {
    // compute_min started from data[0], so a NaN there poisoned the range.
    expect(
      intervalsTimeRange(
        Float32Array.from([NaN, 1, 3]),
        Float32Array.from([0.5, 2, 4]),
      ),
    ).toEqual({ startTime: 0.5, endTime: 4 });
  });

  it("ignores NaN stop times and falls back to the start", () => {
    expect(
      intervalsTimeRange(
        Float32Array.from([1, 3, 10]),
        Float32Array.from([2, NaN, NaN]),
      ),
    ).toEqual({ startTime: 1, endTime: 10 });
  });

  it("returns undefined when no time is finite", () => {
    expect(
      intervalsTimeRange(Float32Array.from([NaN]), Float32Array.from([NaN])),
    ).toBeUndefined();
    expect(intervalsTimeRange([], [])).toBeUndefined();
    expect(intervalsTimeRange([Infinity], [-Infinity])).toBeUndefined();
  });

  it("accepts plain arrays and mismatched lengths", () => {
    expect(intervalsTimeRange([2, 4], [3])).toEqual({
      startTime: 2,
      endTime: 4,
    });
  });
});
