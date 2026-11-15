import type { Session, TimeWindowValue } from "@ui";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

/** The shared time selection as the Time window and Time overview read it. */
export function useTimeWindow(): {
  session: Session;
  value: TimeWindowValue;
  cursor?: number;
  onChange: (value: TimeWindowValue) => void;
  ready: boolean;
} {
  const {
    startTimeSec,
    endTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
    currentTime,
    setVisibleTimeRange,
  } = useTimeseriesSelection();
  const start = visibleStartTimeSec ?? startTimeSec ?? 0;
  const end = visibleEndTimeSec ?? endTimeSec ?? start + 1;
  return {
    session: { start: startTimeSec ?? 0, end: endTimeSec ?? end },
    value: { start, duration: Math.max(end - start, 0) },
    cursor: currentTime,
    onChange: (v) => setVisibleTimeRange(v.start, v.start + v.duration),
    ready: startTimeSec !== undefined && endTimeSec !== undefined,
  };
}
