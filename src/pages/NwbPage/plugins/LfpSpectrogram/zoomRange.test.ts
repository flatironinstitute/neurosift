import { describe, expect, test } from "vitest";
import {
  clampRange,
  RangeBounds,
  zoomRangeAtAnchor,
  TimeRange,
} from "./zoomRange";

const bounds: RangeBounds = {
  dataStart: 0,
  dataEnd: 1000,
  minSpan: 1,
  maxSpan: 100,
};

const ZOOM_OUT = 1.15;
const ZOOM_IN = 1 / 1.15;

describe("zoomRangeAtAnchor", () => {
  test("zooms out about the cursor", () => {
    const next = zoomRangeAtAnchor([100, 110], ZOOM_OUT, 105, bounds);
    expect(next).not.toBeNull();
    expect(next![1] - next![0]).toBeCloseTo(11.5);
    // anchor stays under the cursor
    expect((105 - next![0]) / (next![1] - next![0])).toBeCloseTo(0.5);
  });

  test("zooms in about an off-center cursor, holding that time in place", () => {
    const range: TimeRange = [100, 120];
    const anchor = 115;
    const before = (anchor - range[0]) / (range[1] - range[0]);
    const next = zoomRangeAtAnchor(range, ZOOM_IN, anchor, bounds);
    expect(next).not.toBeNull();
    expect((anchor - next![0]) / (next![1] - next![0])).toBeCloseTo(before);
  });

  // The reported bug: scroll right in time, zoom in, then zoom back out to the
  // maximum. Further wheel ticks used to keep the span pinned at maxSpan while
  // shifting the start, walking the view backwards through time at a fixed
  // zoom. A tick that cannot change the span must not move the window.
  test("does not pan when already fully zoomed out", () => {
    const range: TimeRange = [500, 600]; // span === maxSpan
    expect(zoomRangeAtAnchor(range, ZOOM_OUT, 510, bounds)).toBeNull();
  });

  test("repeated zoom-out ticks at the limit never drift through time", () => {
    let range: TimeRange = [500, 600];
    for (let i = 0; i < 25; i++) {
      range = zoomRangeAtAnchor(range, ZOOM_OUT, 505, bounds) ?? range;
    }
    expect(range).toEqual([500, 600]);
  });

  test("does not pan when already fully zoomed in", () => {
    const range: TimeRange = [500, 501]; // span === minSpan
    expect(zoomRangeAtAnchor(range, ZOOM_IN, 500.2, bounds)).toBeNull();
  });

  test("a zoom-out that partially exceeds maxSpan still lands at maxSpan", () => {
    const next = zoomRangeAtAnchor([500, 590], ZOOM_OUT, 545, bounds);
    expect(next).not.toBeNull();
    expect(next![1] - next![0]).toBeCloseTo(bounds.maxSpan);
  });

  test("zooming out at the recording edge stays inside the data", () => {
    const next = zoomRangeAtAnchor([960, 1000], ZOOM_OUT, 1000, bounds);
    expect(next).not.toBeNull();
    expect(next![1]).toBeLessThanOrEqual(bounds.dataEnd);
    expect(next![0]).toBeGreaterThanOrEqual(bounds.dataStart);
  });
});

describe("clampRange", () => {
  test("holds the span within the zoom limits", () => {
    expect(clampRange(0, 500, bounds)[1]).toBeCloseTo(100);
    expect(clampRange(0, 0.1, bounds)[1]).toBeCloseTo(1);
  });

  test("slides a window past the end back inside the data", () => {
    expect(clampRange(980, 1080, bounds)).toEqual([900, 1000]);
  });
});
