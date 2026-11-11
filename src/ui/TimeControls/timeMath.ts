export type TimeWindowValue = { start: number; duration: number };
export type Session = { start: number; end: number };

/** Zoom in and out by this factor. */
export const ZOOM = 1.4;
/** Earlier and Later move by this share of the window. */
export const STEP = 0.1;
export const MIN_DURATION = 0.01;

/** Seconds with two decimals and a thousands comma: 412.00, 1,375.69. */
export const formatSeconds = (value: number) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** A limit as people write it, trimming zeros: 0, 1,375.69. */
export const formatLimit = (value: number) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

export const parseSeconds = (text: string) => {
  const n = Number(text.replace(/,/g, "").trim());
  return text.trim() === "" || Number.isNaN(n) ? undefined : n;
};

/** Keeps a window inside the session, no shorter than the minimum and no longer than the session. */
export const clampWindow = (
  { start, duration }: TimeWindowValue,
  session: Session,
): TimeWindowValue => {
  const length = session.end - session.start;
  const d = Math.min(Math.max(duration, MIN_DURATION), length);
  const s = Math.min(Math.max(start, session.start), session.end - d);
  return { start: s, duration: d };
};

/** Scales the window around the cursor, or its center, so the cursor stays where it is on screen. */
export const zoom = (
  window: TimeWindowValue,
  factor: number,
  session: Session,
  cursor?: number,
): TimeWindowValue => {
  const anchor =
    cursor !== undefined &&
    cursor >= window.start &&
    cursor <= window.start + window.duration
      ? cursor
      : window.start + window.duration / 2;
  const share = (anchor - window.start) / window.duration;
  const duration = window.duration * factor;
  return clampWindow({ start: anchor - share * duration, duration }, session);
};

/** Moves the window by a number of windows: 0.1 for Earlier and Later, 1 for a whole window. */
export const stepWindow = (
  window: TimeWindowValue,
  windows: number,
  session: Session,
) =>
  clampWindow(
    {
      start: window.start + windows * window.duration,
      duration: window.duration,
    },
    session,
  );

export const atStart = (window: TimeWindowValue, session: Session) =>
  window.start <= session.start;
export const atEnd = (window: TimeWindowValue, session: Session) =>
  window.start + window.duration >= session.end;

/**
 * The time keys a focused plot handles: = and - zoom, arrows step, Home and End jump.
 * Returns the new window, or undefined for any other key.
 */
export const timeKey = (
  key: string,
  window: TimeWindowValue,
  session: Session,
  cursor?: number,
): TimeWindowValue | undefined => {
  switch (key) {
    case "=":
    case "+":
      return zoom(window, 1 / ZOOM, session, cursor);
    case "-":
      return zoom(window, ZOOM, session, cursor);
    case "ArrowLeft":
      return stepWindow(window, -STEP, session);
    case "ArrowRight":
      return stepWindow(window, STEP, session);
    case "Home":
      return clampWindow({ ...window, start: session.start }, session);
    case "End":
      return clampWindow({ ...window, start: session.end }, session);
  }
  return undefined;
};
