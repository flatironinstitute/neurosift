import { describe, expect, it } from "vitest";
import {
  MIN_SELECT_PX,
  dragAction,
  selectedWindow,
  selectionLabel,
  timeAtPixel,
} from "./timeSelect";

const SESSION = { start: 0, end: 100 };
const WINDOW = { start: 10, duration: 4 };
// 400px of plot starting 50px into the page: 100px per second.
const AXIS = { left: 50, width: 400 };

const expectWindow = (
  value: { start: number; duration: number } | undefined,
  start: number,
  duration: number,
) => {
  expect(value?.start).toBeCloseTo(start, 9);
  expect(value?.duration).toBeCloseTo(duration, 9);
};

describe("timeAtPixel", () => {
  it("maps a pixel across the plot to a time in the window", () => {
    expect(timeAtPixel(50, AXIS, WINDOW)).toBe(10);
    expect(timeAtPixel(250, AXIS, WINDOW)).toBe(12);
    expect(timeAtPixel(450, AXIS, WINDOW)).toBe(14);
  });

  it("holds a pointer past either edge at that edge", () => {
    expect(timeAtPixel(0, AXIS, WINDOW)).toBe(10);
    expect(timeAtPixel(900, AXIS, WINDOW)).toBe(14);
  });
});

describe("selectedWindow", () => {
  it("turns a drag into the stretch it covers, either direction", () => {
    expectWindow(selectedWindow(170, 295, AXIS, WINDOW, SESSION), 11.2, 1.25);
    expectWindow(selectedWindow(295, 170, AXIS, WINDOW, SESSION), 11.2, 1.25);
  });

  it("ignores a drag shorter than the minimum, so a click doesn't zoom", () => {
    expect(
      selectedWindow(200, 200 + MIN_SELECT_PX - 1, AXIS, WINDOW, SESSION),
    ).toBeUndefined();
    expect(
      selectedWindow(200, 200 + MIN_SELECT_PX, AXIS, WINDOW, SESSION),
    ).toBeDefined();
  });

  it("stops at the plot's edges", () => {
    expectWindow(selectedWindow(-100, 150, AXIS, WINDOW, SESSION), 10, 1);
  });

  it("keeps the result inside the session", () => {
    const tail = { start: 97, duration: 4 };
    expectWindow(selectedWindow(250, 450, AXIS, tail, SESSION), 99, 1);
  });
});

describe("dragAction", () => {
  it("selects in Select mode, and with Shift held in Pan mode", () => {
    expect(dragAction("select", false)).toBe("select");
    expect(dragAction("select", true)).toBe("select");
    expect(dragAction("pan", true)).toBe("select");
    expect(dragAction("pan", false)).toBe("pan");
  });
});

describe("selectionLabel", () => {
  it("reads the stretch and its length", () => {
    expect(selectionLabel({ start: 1.2, duration: 1.25 })).toEqual({
      range: "1.20–2.45 s",
      length: "1.25 s",
    });
  });
});
