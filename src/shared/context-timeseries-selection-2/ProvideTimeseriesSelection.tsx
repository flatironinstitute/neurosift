import React, { PropsWithChildren, useMemo, useReducer, useState } from "react";
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

export const ProvideTimeseriesSelection: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(
    timeseriesSelectionReducer,
    initialState,
  );
  const [owner] = useState(createPlaybackOwner);

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
