import { describe, expect, it } from "vitest";
import {
  atActualPixels,
  atMaxScale,
  atMinScale,
  clampPan,
  clampScale,
  fitScale,
  fitView,
  MAX_SCALE,
  panBy,
  resolveView,
  scaleLimits,
  settle,
  zoomBy,
  zoomReadout,
  zoomTo,
} from "./zoomMath";

const IMAGE = { width: 2000, height: 1000 };
const VIEW = { width: 500, height: 500 };

describe("zoom math", () => {
  it("fits the image's longer side to the viewport", () => {
    expect(fitScale(IMAGE, VIEW)).toBe(0.25);
    expect(fitScale({ width: 100, height: 50 }, VIEW)).toBe(5);
    expect(fitScale({ width: 0, height: 0 }, VIEW)).toBe(1);
  });

  it("centers the fitted image on the axis it doesn't fill", () => {
    expect(fitView(IMAGE, VIEW)).toEqual({ scale: 0.25, x: 0, y: 125 });
  });

  it("zooms out to fit, or to actual pixels for small images, and in to 32×", () => {
    expect(scaleLimits(IMAGE, VIEW)).toEqual({ min: 0.25, max: MAX_SCALE });
    expect(scaleLimits({ width: 100, height: 50 }, VIEW)).toEqual({
      min: 1,
      max: MAX_SCALE,
    });
    expect(clampScale(0.01, IMAGE, VIEW)).toBe(0.25);
    expect(clampScale(100, IMAGE, VIEW)).toBe(MAX_SCALE);
    expect(clampScale(2, IMAGE, VIEW)).toBe(2);
  });

  it("keeps the image over the viewport when it is larger, and centered when smaller", () => {
    expect(clampPan({ scale: 1, x: 100, y: 100 }, IMAGE, VIEW)).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
    expect(clampPan({ scale: 1, x: -5000, y: -5000 }, IMAGE, VIEW)).toEqual({
      scale: 1,
      x: -1500,
      y: -500,
    });
    expect(clampPan({ scale: 0.25, x: -40, y: 0 }, IMAGE, VIEW)).toEqual({
      scale: 0.25,
      x: 0,
      y: 125,
    });
  });

  it("keeps the point under the pointer still while zooming", () => {
    const start = { scale: 1, x: -500, y: -200 };
    const point = { x: 250, y: 100 };
    const imageX = (point.x - start.x) / start.scale;
    const imageY = (point.y - start.y) / start.scale;
    const next = zoomBy(start, 2, point, IMAGE, VIEW);
    expect(next.scale).toBe(2);
    expect((point.x - next.x) / next.scale).toBeCloseTo(imageX);
    expect((point.y - next.y) / next.scale).toBeCloseTo(imageY);
  });

  it("clamps zoom and keeps the image in view at the limits", () => {
    const fit = fitView(IMAGE, VIEW);
    expect(zoomBy(fit, 0.5, { x: 0, y: 0 }, IMAGE, VIEW)).toEqual(fit);
    expect(zoomTo(fit, 1000, { x: 0, y: 0 }, IMAGE, VIEW).scale).toBe(
      MAX_SCALE,
    );
  });

  it("pans by a distance, within bounds", () => {
    const view = { scale: 1, x: -100, y: -100 };
    expect(panBy(view, -50, 20, IMAGE, VIEW)).toEqual({
      scale: 1,
      x: -150,
      y: -80,
    });
    expect(panBy(view, 1000, 1000, IMAGE, VIEW)).toEqual({
      scale: 1,
      x: 0,
      y: 0,
    });
  });

  it("resolves Fit, and clamps a stored view to the current viewport", () => {
    expect(resolveView("fit", IMAGE, VIEW)).toEqual(fitView(IMAGE, VIEW));
    expect(resolveView({ scale: 0.1, x: 9, y: 9 }, IMAGE, VIEW)).toEqual(
      fitView(IMAGE, VIEW),
    );
  });

  it("reads a view at the fit scale as Fit again", () => {
    expect(settle({ scale: 0.25, x: 0, y: 125 }, IMAGE, VIEW)).toBe("fit");
    const zoomed = { scale: 0.5, x: 0, y: 0 };
    expect(settle(zoomed, IMAGE, VIEW)).toBe(zoomed);
  });

  it("says the zoom in percent, with Fit when fitted", () => {
    expect(zoomReadout("fit", 0.2345)).toBe("Fit · 23%");
    expect(zoomReadout({ scale: 1, x: 0, y: 0 }, 1)).toBe("100%");
    expect(zoomReadout({ scale: 16, x: 0, y: 0 }, 16)).toBe("1,600%");
  });

  it("knows when zoom in, zoom out and 100% have nothing left to do", () => {
    expect(atMinScale(0.25, IMAGE, VIEW)).toBe(true);
    expect(atMinScale(0.5, IMAGE, VIEW)).toBe(false);
    expect(atMaxScale(MAX_SCALE, IMAGE, VIEW)).toBe(true);
    expect(atActualPixels(1)).toBe(true);
    expect(atActualPixels(0.25)).toBe(false);
  });
});
