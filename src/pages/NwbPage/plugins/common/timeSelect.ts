import {
  clampWindow,
  formatSeconds,
  type Session,
  type TimeWindowValue,
} from "@ui";

/** What a plain drag across a plot does. */
export type DragMode = "pan" | "select";

/** A drag shorter than this is a click, not a selection. */
export const MIN_SELECT_PX = 4;

/** The plot's time axis on screen, in client pixels. */
export type AxisSpan = { left: number; width: number };

export const dragAction = (mode: DragMode, shiftKey: boolean): DragMode =>
  mode === "select" || shiftKey ? "select" : "pan";

export const clampPixel = (x: number, axis: AxisSpan) =>
  Math.min(Math.max(x, axis.left), axis.left + axis.width);

export const timeAtPixel = (
  x: number,
  axis: AxisSpan,
  window: TimeWindowValue,
) =>
  window.start +
  ((clampPixel(x, axis) - axis.left) / axis.width) * window.duration;

/** The stretch a drag from `x0` to `x1` covers, inside the session; undefined for a click. */
export const selectedWindow = (
  x0: number,
  x1: number,
  axis: AxisSpan,
  window: TimeWindowValue,
  session: Session,
): TimeWindowValue | undefined => {
  if (Math.abs(clampPixel(x1, axis) - clampPixel(x0, axis)) < MIN_SELECT_PX)
    return undefined;
  const a = timeAtPixel(x0, axis, window);
  const b = timeAtPixel(x1, axis, window);
  const start = Math.max(Math.min(a, b), session.start);
  const end = Math.min(Math.max(a, b), session.end);
  return clampWindow({ start, duration: end - start }, session);
};

export const selectionLabel = ({ start, duration }: TimeWindowValue) => ({
  range: `${formatSeconds(start)}–${formatSeconds(start + duration)} s`,
  length: `${formatSeconds(duration)} s`,
});
