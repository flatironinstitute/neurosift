import { describe, expect, it } from "vitest";
import { tooMuchToDraw } from "./tooMuchToDraw";

describe("tooMuchToDraw", () => {
  // 2 channels at 1,000 Hz: 500 s holds the 1,000,000 values drawn at once.
  const base = { channels: 2, samplingFrequency: 1000, acceptedDuration: 0 };

  it("draws a window up to a million values", () => {
    expect(tooMuchToDraw({ ...base, duration: 500 })).toBe(false);
  });

  it("asks before drawing a longer window", () => {
    expect(tooMuchToDraw({ ...base, duration: 501 })).toBe(true);
  });

  it("draws a window accepted with Draw anyway, and asks again when wider", () => {
    const accepted = { ...base, acceptedDuration: 900 };
    expect(tooMuchToDraw({ ...accepted, duration: 900 })).toBe(false);
    expect(tooMuchToDraw({ ...accepted, duration: 901 })).toBe(true);
  });

  it("treats a missing channel count as one", () => {
    expect(tooMuchToDraw({ ...base, channels: 0, duration: 1000 })).toBe(false);
  });
});
