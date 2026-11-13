export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** A scale, and where the image's top-left corner sits in the viewport, in CSS pixels. */
export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

/** Fit follows the viewport as it resizes; a view stays where it was put. */
export type ImageZoomValue = "fit" | ZoomView;

export const ZOOM_STEP = 1.5;
export const MAX_SCALE = 32;
/** A tenth of the viewport per arrow key press. */
export const PAN_STEP = 0.1;

const EPSILON = 1e-6;

export function fitScale(image: Size, viewport: Size): number {
  if (!image.width || !image.height || !viewport.width || !viewport.height)
    return 1;
  return Math.min(viewport.width / image.width, viewport.height / image.height);
}

/** Zoom out stops at fit, or at actual pixels for an image smaller than the viewport. */
export function scaleLimits(image: Size, viewport: Size) {
  const fit = fitScale(image, viewport);
  return { min: Math.min(fit, 1), max: Math.max(fit, MAX_SCALE) };
}

export function clampScale(scale: number, image: Size, viewport: Size) {
  const { min, max } = scaleLimits(image, viewport);
  return Math.min(max, Math.max(min, scale));
}

/** Centers an axis the image doesn't fill; otherwise keeps the image over the whole axis. */
function clampAxis(offset: number, length: number, room: number) {
  if (length <= room) return (room - length) / 2;
  return Math.min(0, Math.max(room - length, offset));
}

export function clampPan(view: ZoomView, image: Size, viewport: Size) {
  return {
    scale: view.scale,
    x: clampAxis(view.x, image.width * view.scale, viewport.width),
    y: clampAxis(view.y, image.height * view.scale, viewport.height),
  };
}

export function fitView(image: Size, viewport: Size): ZoomView {
  return clampPan(
    { scale: fitScale(image, viewport), x: 0, y: 0 },
    image,
    viewport,
  );
}

export function resolveView(
  value: ImageZoomValue,
  image: Size,
  viewport: Size,
): ZoomView {
  if (value === "fit") return fitView(image, viewport);
  return clampPan(
    { ...value, scale: clampScale(value.scale, image, viewport) },
    image,
    viewport,
  );
}

/** Sets the scale, keeping the image point under `point` where it is. */
export function zoomTo(
  view: ZoomView,
  scale: number,
  point: Point,
  image: Size,
  viewport: Size,
): ZoomView {
  const next = clampScale(scale, image, viewport);
  const ratio = next / view.scale;
  return clampPan(
    {
      scale: next,
      x: point.x - (point.x - view.x) * ratio,
      y: point.y - (point.y - view.y) * ratio,
    },
    image,
    viewport,
  );
}

export function zoomBy(
  view: ZoomView,
  factor: number,
  point: Point,
  image: Size,
  viewport: Size,
) {
  return zoomTo(view, view.scale * factor, point, image, viewport);
}

export function panBy(
  view: ZoomView,
  dx: number,
  dy: number,
  image: Size,
  viewport: Size,
) {
  return clampPan({ ...view, x: view.x + dx, y: view.y + dy }, image, viewport);
}

export function center(viewport: Size): Point {
  return { x: viewport.width / 2, y: viewport.height / 2 };
}

/** A view back at the fit scale reads as Fit again, so it follows resizes. */
export function settle(
  view: ZoomView,
  image: Size,
  viewport: Size,
): ImageZoomValue {
  return Math.abs(view.scale - fitScale(image, viewport)) < EPSILON
    ? "fit"
    : view;
}

export function zoomReadout(value: ImageZoomValue, scale: number): string {
  const percent = `${Math.round(scale * 100).toLocaleString("en-US")}%`;
  return value === "fit" ? `Fit · ${percent}` : percent;
}

export const atMinScale = (scale: number, image: Size, viewport: Size) =>
  scale <= scaleLimits(image, viewport).min + EPSILON;

export const atMaxScale = (scale: number, image: Size, viewport: Size) =>
  scale >= scaleLimits(image, viewport).max - EPSILON;

export const atActualPixels = (scale: number) => Math.abs(scale - 1) < EPSILON;
