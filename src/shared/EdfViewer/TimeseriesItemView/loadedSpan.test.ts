import { describe, expect, it } from "vitest";
import { loadedSpan } from "./loadedSpan";

const times = (from: number, count: number, rate: number) =>
  Float64Array.from({ length: count }, (_, i) => (from + i) / rate);

describe("loadedSpan", () => {
  it("runs from the first sample to just past the last", () => {
    const span = loadedSpan(times(10, 10, 10), 10);
    expect(span?.start).toBe(1);
    expect(span?.end).toBeCloseTo(2, 9);
  });

  it("ends where the data stopped short of the request, at the recording's end", () => {
    expect(loadedSpan(times(10, 10, 10), 4)).toEqual({ start: 1, end: 1.4 });
  });

  it("is undefined when nothing arrived", () => {
    expect(loadedSpan(times(0, 10, 10), 0)).toBeUndefined();
  });

  it("holds a single sample", () => {
    expect(loadedSpan(times(5, 1, 10), 1)).toEqual({ start: 0.5, end: 0.5 });
  });
});
