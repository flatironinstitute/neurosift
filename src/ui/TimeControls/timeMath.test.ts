import { describe, expect, it } from "vitest";
import {
  atEnd,
  atStart,
  clampWindow,
  formatLimit,
  formatSeconds,
  stepWindow,
  timeKey,
  zoom,
} from "./timeMath";

const SESSION = { start: 0, end: 1375.69 };
const W = { start: 412, duration: 3.75 };

describe("time math", () => {
  it("writes seconds with two decimals and a thousands comma, and limits trimmed", () => {
    expect(formatSeconds(412)).toBe("412.00");
    expect(formatSeconds(1375.69)).toBe("1,375.69");
    expect(formatLimit(0)).toBe("0");
    expect(formatLimit(1375.69)).toBe("1,375.69");
  });

  it("zooms by 1.4× around the cursor, keeping it in place", () => {
    const zoomed = zoom(W, 1 / 1.4, SESSION, 413);
    expect(zoomed.duration).toBeCloseTo(3.75 / 1.4);
    const share = (413 - zoomed.start) / zoomed.duration;
    expect(share).toBeCloseTo((413 - 412) / 3.75);
  });

  it("zooms out no further than the whole session", () => {
    expect(zoom({ start: 0, duration: 1300 }, 1.4, SESSION)).toEqual({
      start: 0,
      duration: 1375.69,
    });
  });

  it("steps by a tenth of the window, and stops at the session's edges", () => {
    expect(stepWindow(W, 0.1, SESSION).start).toBeCloseTo(412.375);
    const atZero = stepWindow({ start: 0.2, duration: 3.75 }, -0.1, SESSION);
    expect(atZero.start).toBe(0);
    expect(atStart(atZero, SESSION)).toBe(true);
    const last = clampWindow({ start: 5000, duration: 3.75 }, SESSION);
    expect(last.start).toBeCloseTo(1371.94);
    expect(atEnd(last, SESSION)).toBe(true);
  });

  it("maps the plot's keys to windows, and ignores others", () => {
    expect(timeKey("=", W, SESSION)!.duration).toBeCloseTo(3.75 / 1.4);
    expect(timeKey("-", W, SESSION)!.duration).toBeCloseTo(3.75 * 1.4);
    expect(timeKey("ArrowLeft", W, SESSION)!.start).toBeCloseTo(411.625);
    expect(timeKey("Home", W, SESSION)!.start).toBe(0);
    expect(timeKey("x", W, SESSION)).toBeUndefined();
  });
});
