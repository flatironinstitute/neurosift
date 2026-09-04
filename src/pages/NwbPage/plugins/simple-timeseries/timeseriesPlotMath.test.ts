import { describe, expect, it } from "vitest";
import {
  channelOffset,
  computeAvgStdDev,
  computeChannelRanges,
  computeMax,
  computeMin,
  computeYRange,
} from "./timeseriesPlotMath";

describe("computeMin / computeMax", () => {
  it("skip NaN samples", () => {
    expect(computeMin([NaN, 3, -2, NaN, 5])).toBe(-2);
    expect(computeMax([NaN, 3, -2, NaN, 5])).toBe(5);
  });
  it("return infinities for an all-NaN channel", () => {
    expect(computeMin([NaN, NaN])).toBe(Infinity);
    expect(computeMax([NaN, NaN])).toBe(-Infinity);
  });
});

describe("computeAvgStdDev", () => {
  it("averages the population standard deviation across channels", () => {
    // [-1, 1] has std 1; [-2, 2] has std 2; mean is 1.5
    expect(
      computeAvgStdDev([
        [-1, 1],
        [-2, 2],
      ]),
    ).toBeCloseTo(1.5);
  });
  it("ignores NaN samples and empty channels", () => {
    expect(computeAvgStdDev([[-1, NaN, 1], [NaN]])).toBeCloseTo(0.5);
    expect(computeAvgStdDev([])).toBe(0);
  });
});

describe("channelOffset", () => {
  it("stacks the first channel highest and the last at zero", () => {
    expect(channelOffset(3, 0, 2, 1.5)).toBe(6);
    expect(channelOffset(3, 1, 2, 1.5)).toBe(3);
    expect(channelOffset(3, 2, 2, 1.5)).toBe(0);
  });
});

describe("computeYRange", () => {
  const data = [
    [-1, 1],
    [-1, 1],
  ];
  const ranges = computeChannelRanges(data);
  const avgStdDev = computeAvgStdDev(data); // 1

  it("covers the raw data when there is no separation", () => {
    const { yMin, yMax } = computeYRange(ranges, 0, avgStdDev, 0);
    expect(yMin).toBe(-1);
    expect(yMax).toBe(1);
  });

  it("applies the separation offset exactly once", () => {
    // Channel 0 is shifted up by (2 - 1 - 0) * 2 * 1 = 2, so it spans
    // [1, 3]; channel 1 stays at [-1, 1]. The union is [-1, 3]. The old
    // worker added the offset both when storing per-channel extremes and
    // again when computing the axis, giving [-1, 5].
    const { yMin, yMax } = computeYRange(ranges, 2, avgStdDev, 0);
    expect(yMin).toBe(-1);
    expect(yMax).toBe(3);
  });

  it("matches the offset used to draw each channel", () => {
    const separation = 3;
    const { yMax } = computeYRange(ranges, separation, avgStdDev, 0);
    const topOfFirstChannel =
      ranges.maxs[0] + channelOffset(2, 0, separation, avgStdDev);
    expect(yMax).toBe(topOfFirstChannel);
  });

  it("pads the range by the given fraction", () => {
    const { yMin, yMax } = computeYRange(ranges, 0, avgStdDev, 0.05);
    expect(yMin).toBeCloseTo(-1.1);
    expect(yMax).toBeCloseTo(1.1);
  });

  it("reflects a changed separation without recomputing the ranges", () => {
    const a = computeYRange(ranges, 1, avgStdDev, 0).yMax;
    const b = computeYRange(ranges, 4, avgStdDev, 0).yMax;
    expect(b - a).toBe(3);
  });
});
