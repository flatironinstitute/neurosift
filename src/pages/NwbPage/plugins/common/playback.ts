import type { Session, TimeWindowValue } from "@ui";

const EPSILON = 1e-6;

/** The window moved on by `seconds`, stopping with its right edge on the session's end. */
export const advanceWindow = (
  { start, duration }: TimeWindowValue,
  session: Session,
  seconds: number,
): { value: TimeWindowValue; ended: boolean } => {
  const last = session.end - duration;
  const next = Math.min(start + seconds, last);
  return { value: { start: next, duration }, ended: next >= last - EPSILON };
};

export const atEnd = (value: TimeWindowValue, session: Session) =>
  value.start + value.duration >= session.end - EPSILON;

/**
 * The window to show when Play is pressed: back to the start from the end, and no longer
 * than `maxDuration`, keeping the right edge. Null when it can stay as it is.
 */
export const startWindow = (
  value: TimeWindowValue,
  session: Session,
  maxDuration = Infinity,
): TimeWindowValue | null => {
  const duration = Math.min(value.duration, maxDuration);
  if (atEnd(value, session)) return { start: session.start, duration };
  if (duration === value.duration) return null;
  return { start: value.start + value.duration - duration, duration };
};

/** True when `loaded` holds the window from `start` to `end`, asking nothing past `sessionEnd`. */
export const covers = (
  loaded: { start: number; end: number } | undefined,
  start: number,
  end: number,
  sessionEnd: number,
) =>
  !!loaded &&
  loaded.start <= start + EPSILON &&
  loaded.end >= Math.min(end, sessionEnd) - EPSILON;

export const sameWindow = (a: TimeWindowValue, b: TimeWindowValue) =>
  Math.abs(a.start - b.start) < EPSILON &&
  Math.abs(a.duration - b.duration) < EPSILON;

/**
 * Matches the shown window against those playback set but React hasn't drawn yet;
 * one it never set means someone dragged, typed, zoomed or stepped.
 */
export const settleWindow = (
  pending: TimeWindowValue[],
  shown: TimeWindowValue,
): { pending: TimeWindowValue[]; external: boolean } => {
  if (pending.length === 0) return { pending, external: false };
  const i = pending.findIndex((p) => sameWindow(p, shown));
  return i < 0
    ? { pending: [], external: true }
    : { pending: pending.slice(i), external: false };
};

/** Whole frames due after `seconds` at `rate` frames a second, and the fraction left over. */
export const framesDue = (carry: number, seconds: number, rate: number) => {
  const due = carry + seconds * rate;
  const steps = Math.floor(due);
  return { steps, carry: due - steps };
};

const USES_SPACE = "button, input, select, textarea, [role='slider']";

export const isPlaybackKey = (key: string, target: EventTarget) =>
  key === " " && !(target instanceof Element && target.closest(USES_SPACE));
