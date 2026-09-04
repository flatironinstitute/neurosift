import { describe, expect, it } from "vitest";
import { channelStdev, computeMedian } from "./edfStats";

describe("channelStdev", () => {
  it("computes the population standard deviation", () => {
    expect(channelStdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2);
  });
  it("ignores NaN samples", () => {
    expect(channelStdev([2, NaN, 4, 4, 4, 5, 5, 7, 9, NaN])).toBeCloseTo(2);
  });
  it("is NaN for a channel with no loaded samples", () => {
    expect(channelStdev([NaN, NaN])).toBeNaN();
    expect(channelStdev([])).toBeNaN();
  });
});

describe("computeMedian", () => {
  it("handles odd and even counts", () => {
    expect(computeMedian([3, 1, 2])).toBe(2);
    expect(computeMedian([4, 1, 3, 2])).toBe(2.5);
  });
  it("leaves out NaN entries so one skipped channel does not blank the rest", () => {
    expect(computeMedian([1, NaN, 3])).toBe(2);
    expect(computeMedian([NaN])).toBe(0);
    expect(computeMedian([])).toBe(0);
  });
});
