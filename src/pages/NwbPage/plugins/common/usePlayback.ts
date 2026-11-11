import type { TimeWindowValue } from "@ui";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  advanceWindow,
  isPlaybackKey,
  settleWindow,
  startWindow,
} from "./playback";
import { useTimeWindow } from "./useTimeWindow";

/** A hold shorter than this, such as one chunk loading, isn't worth announcing. */
const WAIT_MS = 250;
/** After a background tab or a long frame, catch up by no more than this. */
const MAX_FRAME_MS = 100;

export type PlaybackClock = {
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  speed: string;
  setSpeed: (speed: string) => void;
  /** True after playback has held a moment for data. */
  waiting: boolean;
  /** Holds playback while the view's data for the next step loads. */
  hold: (holding: boolean) => void;
  /** For the plot's wrapper: Space plays and pauses. */
  onKeyDown: (e: KeyboardEvent) => void;
};

/** A key handler for a plot: Space calls `toggle`. */
export const onSpace = (toggle: () => void) => (e: KeyboardEvent) => {
  if (!isPlaybackKey(e.key, e.target)) return;
  e.preventDefault();
  toggle();
};

/** Calls `advance` each animation frame with the seconds of recording due; it returns false at the end. */
export function usePlaybackClock(
  advance: (seconds: number) => boolean,
): PlaybackClock {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const [waiting, setWaiting] = useState(false);
  const advanceRef = useRef(advance);
  const speedRef = useRef(speed);
  const holdingRef = useRef(false);
  useEffect(() => {
    advanceRef.current = advance;
    speedRef.current = speed;
  });

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | undefined;
    let heldSince: number | undefined;
    const tick = (now: number) => {
      if (last !== undefined && holdingRef.current) {
        heldSince ??= now;
        if (now - heldSince >= WAIT_MS) setWaiting(true);
      } else if (last !== undefined) {
        heldSince = undefined;
        setWaiting(false);
        const ms = Math.min(now - last, MAX_FRAME_MS);
        if (!advanceRef.current((ms / 1000) * Number(speedRef.current))) {
          setPlaying(false);
          return;
        }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setWaiting(false);
    };
  }, [playing]);

  const hold = useCallback((holding: boolean) => {
    holdingRef.current = holding;
  }, []);
  const onKeyDown = onSpace(() => setPlaying(!playing));
  return { playing, setPlaying, speed, setSpeed, waiting, hold, onKeyDown };
}

export type WindowPlayback = PlaybackClock & {
  /** The window's right edge, which playback reads out. */
  time: number;
};

/**
 * Plays the shared time window forward; an outside edit to the window pauses it.
 * `maxDuration` shortens a longer window when Play is pressed.
 */
export function useWindowPlayback(maxDuration?: number): WindowPlayback {
  const { session, value } = useTimeWindow();
  const { setVisibleTimeRange, setCurrentTime } = useTimeseriesSelection();
  const pending = useRef<TimeWindowValue[]>([]);

  const show = (next: TimeWindowValue) => {
    pending.current.push(next);
    setVisibleTimeRange(next.start, next.start + next.duration);
    setCurrentTime(next.start + next.duration);
  };
  const clock = usePlaybackClock((seconds) => {
    const from = pending.current[pending.current.length - 1] ?? value;
    const { value: next, ended } = advanceWindow(from, session, seconds);
    show(next);
    return !ended;
  });

  const { playing, setPlaying } = clock;
  useEffect(() => {
    if (!playing) {
      pending.current = [];
      return;
    }
    const settled = settleWindow(pending.current, value);
    pending.current = settled.pending;
    if (settled.external) setPlaying(false);
  }, [playing, value, setPlaying]);

  const play = (next: boolean) => {
    const start = next ? startWindow(value, session, maxDuration) : null;
    if (start) show(start);
    setPlaying(next);
  };
  return {
    ...clock,
    setPlaying: play,
    onKeyDown: onSpace(() => play(!playing)),
    time: value.start + value.duration,
  };
}
