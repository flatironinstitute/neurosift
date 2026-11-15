import { describe, expect, it } from "vitest";
import {
  MAX_READ_AHEAD,
  canStepFrame,
  clampFrameIndex,
  framesToRead,
  splitFrames,
  steppedFrameIndex,
} from "./frameStepping";

describe("clampFrameIndex", () => {
  it("keeps indices inside the dataset", () => {
    expect(clampFrameIndex(-1, 10)).toBe(0);
    expect(clampFrameIndex(0, 10)).toBe(0);
    expect(clampFrameIndex(9, 10)).toBe(9);
    expect(clampFrameIndex(10, 10)).toBe(9);
    expect(clampFrameIndex(500, 10)).toBe(9);
  });
  it("returns 0 for an empty dataset", () => {
    expect(clampFrameIndex(3, 0)).toBe(0);
  });
});

describe("steppedFrameIndex", () => {
  it("steps forward and backward inside the range", () => {
    expect(steppedFrameIndex(4, 1, 10)).toBe(5);
    expect(steppedFrameIndex(4, -1, 10)).toBe(3);
  });
  it("does not step past the last frame", () => {
    // This is the case that used to request frame N and reject.
    expect(steppedFrameIndex(9, 1, 10)).toBeUndefined();
  });
  it("does not step before the first frame", () => {
    expect(steppedFrameIndex(0, -1, 10)).toBeUndefined();
  });
  it("clamps a large step to the boundary", () => {
    expect(steppedFrameIndex(8, 5, 10)).toBe(9);
    expect(steppedFrameIndex(1, -5, 10)).toBe(0);
  });
  it("returns undefined when the frame or size is unknown", () => {
    expect(steppedFrameIndex(undefined, 1, 10)).toBeUndefined();
    expect(steppedFrameIndex(3, 1, undefined)).toBeUndefined();
  });
});

describe("canStepFrame", () => {
  it("enables buttons only when a step would move", () => {
    expect(canStepFrame(0, -1, 10)).toBe(false);
    expect(canStepFrame(0, 1, 10)).toBe(true);
    expect(canStepFrame(9, 1, 10)).toBe(false);
    expect(canStepFrame(9, -1, 10)).toBe(true);
    expect(canStepFrame(undefined, 1, 10)).toBe(false);
    expect(canStepFrame(0, 1, 1)).toBe(false);
  });
});

describe("framesToRead", () => {
  it("reads half a second of frames ahead while playing, within limits", () => {
    expect(framesToRead(false, 30, 1)).toBe(1);
    expect(framesToRead(true, 30, 1)).toBe(15);
    expect(framesToRead(true, 30, 8)).toBe(MAX_READ_AHEAD);
    expect(framesToRead(true, 1, 0.1)).toBe(1);
    expect(framesToRead(true, undefined, 1)).toBe(1);
  });
});

describe("splitFrames", () => {
  it("cuts a block of frames into one array per frame index", () => {
    const frames = splitFrames(Uint16Array.from([1, 2, 3, 4, 5, 6]), 10, 2);
    expect([...frames.keys()]).toEqual([10, 11, 12]);
    expect([...frames.get(11)!]).toEqual([3, 4]);
  });
});
