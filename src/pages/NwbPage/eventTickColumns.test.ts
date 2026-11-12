import { describe, expect, it } from "vitest";
import { eventTickColumns, eventTicksPath } from "./eventTickColumns";

describe("eventTickColumns", () => {
  it("places each event in its pixel column across the span", () => {
    expect(eventTickColumns([0, 5, 10], 0, 10, 11)).toEqual([0, 5, 10]);
  });

  it("draws at most one tick per pixel column", () => {
    const times = Array.from({ length: 10000 }, (_, i) => i / 10000);
    const columns = eventTickColumns(times, 0, 1, 100);
    expect(columns).toHaveLength(100);
    expect(new Set(columns).size).toBe(100);
  });

  it("keeps the last time inside the last column", () => {
    expect(eventTickColumns([20], 10, 10, 50)).toEqual([49]);
  });

  it("skips times outside the span and NaN", () => {
    expect(eventTickColumns([-1, NaN, 2, 11], 0, 10, 10)).toEqual([2]);
  });

  it("returns nothing without a width or a span", () => {
    expect(eventTickColumns([1, 2], 0, 10, 0)).toEqual([]);
    expect(eventTickColumns([1, 2], 0, 0, 10)).toEqual([]);
  });

  it("works on typed arrays and returns sorted columns", () => {
    expect(eventTickColumns(Float64Array.from([9, 1, 5]), 0, 10, 10)).toEqual([
      1, 5, 9,
    ]);
  });
});

describe("eventTicksPath", () => {
  it("draws one vertical line per column, centered on the pixel", () => {
    expect(eventTicksPath([0, 3], 8)).toBe("M0.5 0v8M3.5 0v8");
  });

  it("is empty with no columns", () => {
    expect(eventTicksPath([], 8)).toBe("");
  });
});
