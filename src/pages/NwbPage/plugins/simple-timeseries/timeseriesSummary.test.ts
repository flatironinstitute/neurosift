import { describe, expect, it } from "vitest";
import { timeseriesSummary } from "./timeseriesSummary";

describe("timeseriesSummary", () => {
  it("gives the span, rate and channels", () => {
    expect(
      timeseriesSummary({
        totalNumChannels: 70,
        samplingFrequency: 400,
        timeseriesStartTime: 0,
        timeseriesDuration: 1375.69,
      }),
    ).toBe("0.00–1,375.69 s · 400 Hz · 70 channels");
  });

  it("says one channel in the singular", () => {
    expect(
      timeseriesSummary({
        totalNumChannels: 1,
        samplingFrequency: 2000,
        timeseriesStartTime: 0,
        timeseriesDuration: 1306.8,
      }),
    ).toBe("0.00–1,306.80 s · 2,000 Hz · 1 channel");
  });
});
