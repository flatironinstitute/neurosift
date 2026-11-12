import React, { PropsWithChildren, useMemo, useReducer } from "react";
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

  const value = useMemo(
    () => ({
      timeseriesSelection: state,
      dispatch,
    }),
    [state],
  );

  return (
    <TimeseriesSelectionContext.Provider value={value}>
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};
