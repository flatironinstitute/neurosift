import { describe, expect, it } from "vitest";
import { distinctLabelValues, labeledEventPoints } from "./labeledEventsPoints";

describe("labeledEventPoints", () => {
  it("pairs every timestamp with the value from the single channel", () => {
    const timestamps = [0.5, 1.0, 1.5, 2.0];
    const data = [[2, 0, 1, 2]]; // channel-major: one channel
    expect(labeledEventPoints(timestamps, data)).toEqual([
      { timestamp: 0.5, value: 2 },
      { timestamp: 1.0, value: 0 },
      { timestamp: 1.5, value: 1 },
      { timestamp: 2.0, value: 2 },
    ]);
  });

  it("returns one point per event, not one per channel", () => {
    const timestamps = Array.from({ length: 50 }, (_, i) => i * 0.1);
    const data = [timestamps.map((_, i) => i % 3)];
    expect(labeledEventPoints(timestamps, data)).toHaveLength(50);
  });

  it("handles empty input", () => {
    expect(labeledEventPoints([], [])).toEqual([]);
    expect(labeledEventPoints([], [[]])).toEqual([]);
  });

  it("truncates to the shorter of timestamps and values", () => {
    expect(labeledEventPoints([0, 1, 2], [[5, 6]])).toEqual([
      { timestamp: 0, value: 5 },
      { timestamp: 1, value: 6 },
    ]);
  });
});

describe("distinctLabelValues", () => {
  it("lists the label indices present in increasing order", () => {
    const points = labeledEventPoints([0, 1, 2, 3, 4], [[3, 0, 3, 1, 0]]);
    expect(distinctLabelValues(points)).toEqual([0, 1, 3]);
  });
});
