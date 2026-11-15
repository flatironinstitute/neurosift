import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import {
  STEP,
  clampWindow,
  formatLimit,
  formatSeconds,
  stepWindow,
  type Session,
  type TimeWindowValue,
} from "./timeMath";
import "./TimeControls.css";

interface TimeOverviewProps {
  session: Session;
  value: TimeWindowValue;
  /** The cursor shared with every view. */
  cursor?: number;
  onChange: (value: TimeWindowValue) => void;
}

/** The whole session as a strip: the outlined box is the visible window, the red line the cursor. */
export function TimeOverview({
  session,
  value,
  cursor,
  onChange,
}: TimeOverviewProps) {
  const strip = useRef<HTMLDivElement>(null);
  const grab = useRef<number | null>(null);
  const length = session.end - session.start;
  const pct = (t: number) => `${((t - session.start) / length) * 100}%`;
  const timeAt = (clientX: number) => {
    const box = strip.current!.getBoundingClientRect();
    return session.start + ((clientX - box.left) / box.width) * length;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const t = timeAt(event.clientX);
    const inside = t >= value.start && t <= value.start + value.duration;
    // Grabbing the box keeps the grab point; a click elsewhere centers the window there.
    grab.current = inside ? t - value.start : value.duration / 2;
    if (!inside)
      onChange(
        clampWindow({ ...value, start: t - value.duration / 2 }, session),
      );
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = "";
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (grab.current === null) return;
    onChange(
      clampWindow(
        { ...value, start: timeAt(event.clientX) - grab.current },
        session,
      ),
    );
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    grab.current = null;
    delete event.currentTarget.dataset.dragging;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 1 : STEP;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? stepWindow(value, step, session)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? stepWindow(value, -step, session)
          : event.key === "Home"
            ? clampWindow({ ...value, start: session.start }, session)
            : event.key === "End"
              ? clampWindow({ ...value, start: session.end }, session)
              : undefined;
    if (!next) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div className="ns-overview">
      <div
        ref={strip}
        role="slider"
        tabIndex={0}
        aria-label="Time overview"
        aria-valuemin={session.start}
        aria-valuemax={session.end - value.duration}
        aria-valuenow={value.start}
        aria-valuetext={`${formatSeconds(value.duration)} s from ${formatSeconds(value.start)} s`}
        className="ns-overview-strip"
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg className="ns-overview-svg" aria-hidden="true">
          <rect
            className="ns-overview-window"
            x={pct(value.start)}
            width={`${(value.duration / length) * 100}%`}
            y="1"
            height="22"
          />
          {cursor !== undefined && (
            <rect
              className="ns-overview-cursor"
              x={pct(cursor)}
              width="2"
              y="0"
              height="100%"
            />
          )}
        </svg>
      </div>
      <div className="ns-overview-labels" aria-hidden="true">
        <span>{formatLimit(session.start)} s</span>
        <span>{formatSeconds(session.end)} s</span>
      </div>
    </div>
  );
}
