import { useEffect, useState } from "react";
import { IconButton } from "../IconButton/IconButton";
import { TimeField } from "./TimeField";
import {
  MIN_DURATION,
  STEP,
  ZOOM,
  atEnd,
  atStart,
  clampWindow,
  formatLimit,
  formatSeconds,
  parseSeconds,
  stepWindow,
  zoom,
  type Session,
  type TimeWindowValue,
} from "./timeMath";
import "../base.css";
import "./TimeControls.css";

interface TimeWindowProps {
  value: TimeWindowValue;
  session: Session;
  /** Zoom keeps the cursor where it is on screen. */
  cursor?: number;
  onChange: (value: TimeWindowValue) => void;
}

const SETTLE = 500;

/** Which stretch of the session a plot shows: a duration from a start, both editable, with zoom and step. */
export function TimeWindow({
  value,
  session,
  cursor,
  onChange,
}: TimeWindowProps) {
  const latestStart = session.end - value.duration;
  const said = `${formatSeconds(value.duration)} s from ${formatSeconds(value.start)} s`;
  const [announced, setAnnounced] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(said), SETTLE);
    return () => clearTimeout(timer);
  }, [said]);

  return (
    <div className="ns-time-group" role="group" aria-label="Time window">
      <span className="ns-time-label" aria-hidden="true">
        Time window
      </span>
      <TimeField
        label="Window length"
        unit="s"
        text={formatSeconds(value.duration)}
        commit={(draft) => {
          const d = parseSeconds(draft);
          const longest = session.end - session.start;
          if (d === undefined || d < MIN_DURATION || d > longest)
            return `Length must be between ${formatLimit(MIN_DURATION)} and ${formatLimit(longest)} s.`;
          onChange(clampWindow({ ...value, duration: d }, session));
          return undefined;
        }}
      />
      <span className="ns-time-text">from</span>
      <TimeField
        label="Window start"
        unit="s"
        text={formatSeconds(value.start)}
        commit={(draft) => {
          const s = parseSeconds(draft);
          if (s === undefined || s < session.start || s > latestStart)
            return `Start must be between ${formatLimit(session.start)} and ${formatLimit(latestStart)} s.`;
          onChange({ ...value, start: s });
          return undefined;
        }}
      />
      <span className="ns-time-divider" />
      <IconButton
        icon="zoom--in"
        label="Zoom in"
        size="sm"
        shortcut="="
        onClick={() => onChange(zoom(value, 1 / ZOOM, session, cursor))}
      />
      <IconButton
        icon="zoom--out"
        label="Zoom out"
        size="sm"
        shortcut="-"
        onClick={() => onChange(zoom(value, ZOOM, session, cursor))}
      />
      <span className="ns-time-divider" />
      <IconButton
        icon="chevron--left"
        label="Earlier"
        size="sm"
        shortcut="ArrowLeft"
        disabled={atStart(value, session)}
        onClick={() => onChange(stepWindow(value, -STEP, session))}
      />
      <IconButton
        icon="chevron--right"
        label="Later"
        size="sm"
        shortcut="ArrowRight"
        disabled={atEnd(value, session)}
        onClick={() => onChange(stepWindow(value, STEP, session))}
      />
      <span role="status" className="ns-visually-hidden">
        {announced}
      </span>
    </div>
  );
}
