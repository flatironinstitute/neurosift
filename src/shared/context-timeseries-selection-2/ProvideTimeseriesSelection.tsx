import {
  useLinkedSettings,
  useShareSettings,
} from "@shared/shareLink/useShareSettings";
import { formatNumber, parseNumber } from "@shared/shareLink/linkSettings";
import React, {
  PropsWithChildren,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { createPlaybackOwner, PlaybackOwnerContext } from "./playbackOwner";
import {
  TimeseriesSelectionContext,
  TimeseriesSelectionState,
  timeseriesSelectionReducer,
} from "./TimeseriesSelectionContext";

const initialState: TimeseriesSelectionState = {
  startTimeSec: undefined,
  endTimeSec: undefined,
  visibleStartTimeSec: undefined,
  visibleEndTimeSec: undefined,
  visibleTimeRangeHasBeenSetAtLeastOnce: false,
  currentTime: undefined,
};

/** The time window in a link (start, duration), applied once the views open; offered back only when moved. */
const useShareTimeWindow = (
  state: TimeseriesSelectionState,
  dispatch: React.Dispatch<Parameters<typeof timeseriesSelectionReducer>[1]>,
) => {
  const linked = useLinkedSettings();
  const [pending, setPending] = useState(() => {
    const start = parseNumber(linked.get("start"));
    const duration = parseNumber(linked.get("duration"));
    const valid = duration === undefined || duration > 0;
    return valid && (start !== undefined || duration !== undefined)
      ? { start, duration }
      : undefined;
  });
  const { visibleStartTimeSec: from, visibleEndTimeSec: to } = state;
  useEffect(() => {
    if (!pending || from === undefined || to === undefined) return;
    const start = pending.start ?? from;
    const end = start + (pending.duration ?? to - from);
    dispatch({
      type: "setVisibleTimeRange",
      visibleStartTimeSec: start,
      visibleEndTimeSec: end,
    });
    setPending(undefined);
  }, [pending, from, to, dispatch]);

  const span = (a?: number, b?: number) =>
    a === undefined || b === undefined
      ? undefined
      : { start: formatNumber(a), duration: formatNumber(b - a) };
  const now = span(from, to);
  const opened = span(
    state.defaultVisibleStartTimeSec,
    state.defaultVisibleEndTimeSec,
  );
  // Until the views open and the link's window applies, the link keeps its own.
  const ready = !pending && now && opened;
  const moved =
    ready && (now.start !== opened.start || now.duration !== opened.duration);
  const setting = (key: string, value: string) => ({
    key,
    value: moved ? value : "",
    default: "",
    label: "the time window",
  });
  useShareSettings(
    ready
      ? [setting("start", now.start), setting("duration", now.duration)]
      : [],
  );
};

export const ProvideTimeseriesSelection: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    timeseriesSelectionReducer,
    initialState,
  );
  const [owner] = useState(createPlaybackOwner);
  useShareTimeWindow(state, dispatch);

  const value = useMemo(
    () => ({
      timeseriesSelection: state,
      dispatch,
    }),
    [state],
  );

  return (
    <TimeseriesSelectionContext.Provider value={value}>
      <PlaybackOwnerContext.Provider value={owner}>
        {children}
      </PlaybackOwnerContext.Provider>
    </TimeseriesSelectionContext.Provider>
  );
};
