// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  advanceWindow,
  atEnd,
  covers,
  framesDue,
  isPlaybackKey,
  sameWindow,
  settleWindow,
  startWindow,
} from "./playback";

const SESSION = { start: 0, end: 100 };

describe("advanceWindow", () => {
  it("moves the window forward by the elapsed seconds, keeping its length", () => {
    expect(advanceWindow({ start: 10, duration: 4 }, SESSION, 0.5)).toEqual({
      value: { start: 10.5, duration: 4 },
      ended: false,
    });
  });

  it("stops with the window's right edge on the session's end", () => {
    expect(advanceWindow({ start: 95, duration: 4 }, SESSION, 3)).toEqual({
      value: { start: 96, duration: 4 },
      ended: true,
    });
  });
});

describe("atEnd", () => {
  it("is true once the right edge reaches the end", () => {
    expect(atEnd({ start: 96, duration: 4 }, SESSION)).toBe(true);
    expect(atEnd({ start: 95.9, duration: 4 }, SESSION)).toBe(false);
  });
});

describe("startWindow", () => {
  it("leaves a window that fits alone", () => {
    expect(startWindow({ start: 10, duration: 20 }, SESSION, 30)).toBeNull();
    expect(startWindow({ start: 10, duration: 20 }, SESSION)).toBeNull();
  });

  it("shortens a long window, keeping its right edge", () => {
    expect(startWindow({ start: 10, duration: 50 }, SESSION, 30)).toEqual({
      start: 30,
      duration: 30,
    });
  });

  it("goes back to the start from the end, shortened if needed", () => {
    expect(startWindow({ start: 96, duration: 4 }, SESSION)).toEqual({
      start: 0,
      duration: 4,
    });
    expect(startWindow({ start: 50, duration: 50 }, SESSION, 30)).toEqual({
      start: 0,
      duration: 30,
    });
  });
});

describe("sameWindow", () => {
  it("ignores floating-point noise but not a real move", () => {
    expect(
      sameWindow(
        { start: 0.1 + 0.2, duration: 1 },
        { start: 0.3, duration: 1 },
      ),
    ).toBe(true);
    expect(
      sameWindow({ start: 0.3, duration: 1 }, { start: 0.31, duration: 1 }),
    ).toBe(false);
  });
});

describe("settleWindow", () => {
  const a = { start: 1, duration: 2 };
  const b = { start: 2, duration: 2 };
  const c = { start: 3, duration: 2 };

  it("drops windows playback set before the one now shown", () => {
    expect(settleWindow([a, b, c], b)).toEqual({
      pending: [b, c],
      external: false,
    });
  });

  it("calls a window playback never set an outside edit", () => {
    expect(settleWindow([a, b], { start: 50, duration: 2 })).toEqual({
      pending: [],
      external: true,
    });
  });

  it("has nothing to compare before playback sets a window", () => {
    expect(settleWindow([], a)).toEqual({ pending: [], external: false });
  });
});

describe("framesDue", () => {
  it("steps whole frames at the series' rate and carries the rest", () => {
    const first = framesDue(0, 0.05, 30);
    expect(first.steps).toBe(1);
    expect(first.carry).toBeCloseTo(0.5);
    const next = framesDue(0.5, 0.02, 30);
    expect(next.steps).toBe(1);
    expect(next.carry).toBeCloseTo(0.1);
    expect(framesDue(0, 0.01, 30).steps).toBe(0);
  });
});

describe("isPlaybackKey", () => {
  it("takes Space, except in a control that uses it", () => {
    const div = document.createElement("div");
    const button = document.createElement("button");
    expect(isPlaybackKey(" ", div)).toBe(true);
    expect(isPlaybackKey("Enter", div)).toBe(false);
    expect(isPlaybackKey(" ", button)).toBe(false);
  });
});

describe("covers", () => {
  it("is true when the loaded span holds the whole window", () => {
    expect(covers({ start: 9, end: 20 }, 10, 15, 100)).toBe(true);
  });

  it("is false before anything has loaded, or when either edge is missing", () => {
    expect(covers(undefined, 10, 15, 100)).toBe(false);
    expect(covers({ start: 11, end: 20 }, 10, 15, 100)).toBe(false);
    expect(covers({ start: 9, end: 14 }, 10, 15, 100)).toBe(false);
  });

  it("asks for nothing past the session's end", () => {
    expect(covers({ start: 90, end: 100 }, 95, 105, 100)).toBe(true);
  });

  it("forgives rounding in sample times", () => {
    expect(covers({ start: 1, end: 1.9999999999999998 }, 1, 2, 100)).toBe(true);
  });
});
