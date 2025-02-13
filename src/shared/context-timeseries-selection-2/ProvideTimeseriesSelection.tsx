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

  const initializeTimeseriesSelection = useMemo(
    () =>
      (o: {
        startTimeSec: number;
        endTimeSec: number;
        initialVisibleStartTimeSec?: number;
        initialVisibleEndTimeSec?: number;
      }) => {
        dispatch({
          type: "initializeTimeseries",
          startTimeSec: o.startTimeSec,
          endTimeSec: o.endTimeSec,
          initialVisibleStartTimeSec: o.initialVisibleStartTimeSec,
          initialVisibleEndTimeSec: o.initialVisibleEndTimeSec,
        });
      },
    [],
  );

  const setVisibleTimeRange = useMemo(
    () => (visibleStartTimeSec: number, visibleEndTimeSec: number) => {
      dispatch({
        type: "setVisibleTimeRange",
        visibleStartTimeSec,
        visibleEndTimeSec,
      });
    },
    [],
  );

  const setCurrentTime = useMemo(
    () => (currentTime: number | undefined) => {
      dispatch({ type: "setCurrentTime", currentTime });
    },
    [],
  );

  const value = useMemo(
    () => ({
      initializeTimeseriesSelection,
      setVisibleTimeRange,
      setCurrentTime,
      timeseriesSelection: state,
    }),
    [initializeTimeseriesSelection, setVisibleTimeRange, setCurrentTime, state],
  );

  return (
    <TimeseriesSelectionContext.Provider value={value}>
      {children}
    </TimeseriesSelectionContext.Provider>
  );
};
