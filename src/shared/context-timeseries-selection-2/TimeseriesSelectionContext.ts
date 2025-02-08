import React, { useCallback, useContext, useEffect } from "react";
import {
  PanDirection,
  panTime,
  panTimeDeltaT,
  ZoomDirection,
  zoomTime,
} from "./helpers";

export type TimeseriesSelectionState = {
  startTimeSec: number | undefined;
  endTimeSec: number | undefined;
  visibleStartTimeSec: number | undefined;
  visibleEndTimeSec: number | undefined;
  currentTime: number | undefined;
};

type TimeseriesSelectionAction =
  | {
      type: "initializeTimeseries";
      startTimeSec: number;
      endTimeSec: number;
    }
  | {
      type: "setVisibleTimeRange";
      visibleStartTimeSec: number;
      visibleEndTimeSec: number;
    }
  | {
      type: "setCurrentTime";
      currentTime: number | undefined;
    };

export type TimeseriesSelectionContextType = {
  timeseriesSelection: TimeseriesSelectionState;
  initializeTimeseriesSelection: (
    startTimeSec: number,
    endTimeSec: number,
  ) => void;
  setVisibleTimeRange: (
    visibleStartTimeSec: number,
    visibleEndTimeSec: number,
  ) => void;
  setCurrentTime: (currentTime: number | undefined) => void;
};

export const timeseriesSelectionReducer = (
  state: TimeseriesSelectionState,
  action: TimeseriesSelectionAction,
): TimeseriesSelectionState => {
  console.log("---- reducer", action.type, action);
  switch (action.type) {
    case "initializeTimeseries": {
      const newStartTimeSec =
        state.startTimeSec === undefined
          ? action.startTimeSec
          : Math.min(state.startTimeSec, action.startTimeSec);

      const newEndTimeSec =
        state.endTimeSec === undefined
          ? action.endTimeSec
          : Math.max(state.endTimeSec, action.endTimeSec);

      // Only adjust visible range if it's defined
      let newVisibleStartTimeSec = state.visibleStartTimeSec;
      let newVisibleEndTimeSec = state.visibleEndTimeSec;

      if (
        newVisibleStartTimeSec !== undefined &&
        newVisibleEndTimeSec !== undefined
      ) {
        // Ensure visible range is within bounds
        newVisibleStartTimeSec = Math.max(
          newStartTimeSec,
          newVisibleStartTimeSec,
        );
        newVisibleEndTimeSec = Math.min(newEndTimeSec, newVisibleEndTimeSec);
      }

      return {
        startTimeSec: newStartTimeSec,
        endTimeSec: newEndTimeSec,
        visibleStartTimeSec: newVisibleStartTimeSec,
        visibleEndTimeSec: newVisibleEndTimeSec,
        currentTime: state.currentTime,
      };
    }
    case "setVisibleTimeRange": {
      let newVisibleStartTimeSec = action.visibleStartTimeSec;
      let newVisibleEndTimeSec = action.visibleEndTimeSec;

      if (state.startTimeSec !== undefined && state.endTimeSec !== undefined) {
        // Adjust to fit within bounds if they exist
        newVisibleStartTimeSec = Math.max(
          state.startTimeSec,
          newVisibleStartTimeSec,
        );
        newVisibleEndTimeSec = Math.min(state.endTimeSec, newVisibleEndTimeSec);
      }

      return {
        ...state,
        visibleStartTimeSec: newVisibleStartTimeSec,
        visibleEndTimeSec: newVisibleEndTimeSec,
      };
    }
    case "setCurrentTime": {
      return {
        ...state,
        currentTime: action.currentTime,
      };
    }
    default:
      return state;
  }
};

export const TimeseriesSelectionContext = React.createContext<
  TimeseriesSelectionContextType | undefined
>(undefined);

export const useTimeseriesSelection = () => {
  const context = useContext(TimeseriesSelectionContext);
  if (context === undefined) {
    throw new Error(
      "useTimeseriesSelection must be used within a TimeseriesSelectionContext.Provider",
    );
  }
  return {
    initializeTimeseriesSelection: context.initializeTimeseriesSelection,
    setVisibleTimeRange: context.setVisibleTimeRange,
    setCurrentTime: context.setCurrentTime,
    timeseriesSelection: context.timeseriesSelection,
    startTimeSec: context.timeseriesSelection.startTimeSec,
    endTimeSec: context.timeseriesSelection.endTimeSec,
    visibleStartTimeSec: context.timeseriesSelection.visibleStartTimeSec,
    visibleEndTimeSec: context.timeseriesSelection.visibleEndTimeSec,
    currentTime: context.timeseriesSelection.currentTime,
  };
};
export const useTimeRange = () => {
  const {
    visibleStartTimeSec,
    visibleEndTimeSec,
    currentTime,
    setCurrentTime,
    startTimeSec,
    endTimeSec,
    setVisibleTimeRange,
  } = useTimeseriesSelection();
  const zoomTimeseriesSelection = useCallback(
    (direction: ZoomDirection, factor?: number, hoverTimeSec?: number) => {
      const newTimeseriesSelection = zoomTime(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          currentTime,
          startTimeSec,
          endTimeSec,
        },
        direction,
        factor,
        hoverTimeSec,
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      currentTime,
      startTimeSec,
      endTimeSec,
      setVisibleTimeRange,
    ],
  );
  const panTimeseriesSelection = useCallback(
    (direction: PanDirection, pct?: number) => {
      const newTimeseriesSelection = panTime(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          startTimeSec,
          endTimeSec,
          currentTime,
        },
        { type: direction, panAmountPct: pct ?? 10 },
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      startTimeSec,
      endTimeSec,
      currentTime,
      setVisibleTimeRange,
    ],
  );
  const panTimeseriesSelectionDeltaT = useCallback(
    (deltaT: number) => {
      const newTimeseriesSelection = panTimeDeltaT(
        {
          visibleStartTimeSec,
          visibleEndTimeSec,
          startTimeSec,
          endTimeSec,
          currentTime,
        },
        { deltaT },
      );
      if (
        newTimeseriesSelection.visibleStartTimeSec !== undefined &&
        newTimeseriesSelection.visibleEndTimeSec !== undefined
      )
        setVisibleTimeRange(
          newTimeseriesSelection.visibleStartTimeSec,
          newTimeseriesSelection.visibleEndTimeSec,
        );
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      startTimeSec,
      endTimeSec,
      currentTime,
      setVisibleTimeRange,
    ],
  );
  const setCurrentTimeFraction = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (fraction: number, _opts: { event: React.MouseEvent }) => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;
      const newCurrentTime =
        visibleStartTimeSec +
        fraction * (visibleEndTimeSec - visibleStartTimeSec);
      setCurrentTime(newCurrentTime);
    },
    [visibleStartTimeSec, visibleEndTimeSec, setCurrentTime],
  );
  return {
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    panTimeseriesSelectionDeltaT,
    setCurrentTimeFraction,
  };
};

// for convenience
export const useTimeseriesSelectionInitialization = (
  startTimeSec: number | undefined,
  endTimeSec: number | undefined,
) => {
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(() => {
    if (startTimeSec !== undefined && endTimeSec !== undefined) {
      initializeTimeseriesSelection(startTimeSec, endTimeSec);
    }
  }, [startTimeSec, endTimeSec, initializeTimeseriesSelection]);
};
