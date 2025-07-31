import React, { useCallback, useContext } from "react";
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
  visibleTimeRangeHasBeenSetAtLeastOnce: boolean;
  visibleStartTimeSec: number | undefined;
  visibleEndTimeSec: number | undefined;
  currentTime: number | undefined;
};

type TimeseriesSelectionAction =
  | {
      type: "initializeTimeseries";
      startTimeSec: number;
      endTimeSec: number;
      initialVisibleStartTimeSec: number | undefined;
      initialVisibleEndTimeSec: number | undefined;
    }
  | {
      type: "setVisibleTimeRange";
      visibleStartTimeSec: number;
      visibleEndTimeSec: number;
    }
  | {
      type: "setCurrentTime";
      currentTime: number | undefined;
    }
  | {
      type: "zoomVisibleTimeRange";
      factor: number;
    }
  | {
      type: "translateVisibleTimeRangeFrac";
      frac: number;
    };

export type TimeseriesSelectionContextType = {
  timeseriesSelection: TimeseriesSelectionState;
  dispatch: (action: TimeseriesSelectionAction) => void;
};

export const timeseriesSelectionReducer = (
  state: TimeseriesSelectionState,
  action: TimeseriesSelectionAction,
): TimeseriesSelectionState => {
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

      let newVisibleStartTimeSec = state.visibleStartTimeSec;
      let newVisibleEndTimeSec = state.visibleEndTimeSec;
      if (!state.visibleTimeRangeHasBeenSetAtLeastOnce) {
        if (
          action.initialVisibleStartTimeSec !== undefined &&
          action.initialVisibleEndTimeSec !== undefined
        ) {
          // we are setting an initial visible time range
          if (
            state.visibleStartTimeSec === undefined ||
            state.visibleStartTimeSec > action.initialVisibleStartTimeSec
          ) {
            newVisibleStartTimeSec = action.initialVisibleStartTimeSec;
          }
          if (
            state.visibleEndTimeSec === undefined ||
            state.visibleEndTimeSec < action.initialVisibleEndTimeSec
          ) {
            newVisibleEndTimeSec = action.initialVisibleEndTimeSec;
          }
        }
      }

      return {
        startTimeSec: newStartTimeSec,
        endTimeSec: newEndTimeSec,
        visibleStartTimeSec: newVisibleStartTimeSec,
        visibleEndTimeSec: newVisibleEndTimeSec,
        visibleTimeRangeHasBeenSetAtLeastOnce:
          state.visibleTimeRangeHasBeenSetAtLeastOnce,
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
        visibleTimeRangeHasBeenSetAtLeastOnce: true,
      };
    }
    case "zoomVisibleTimeRange": {
      let t1 = state.visibleStartTimeSec;
      let t2 = state.visibleEndTimeSec;
      if (t1 === undefined || t2 === undefined) {
        return state;
      }
      const visibleDuration = t2 - t1;
      const newVisibleDuration = visibleDuration * action.factor;
      const anchorTime = t1; // anchor time is the fixed point
      const newVisibleStartTimeSecFrac = (t1 - anchorTime) / visibleDuration;
      const newVisibleEndTimeSecFrac = (t2 - anchorTime) / visibleDuration;

      t1 = anchorTime + newVisibleStartTimeSecFrac * newVisibleDuration;
      t2 = anchorTime + newVisibleEndTimeSecFrac * newVisibleDuration;

      // ensure that the new visible time range is within the bounds
      if (state.endTimeSec !== undefined && state.startTimeSec !== undefined) {
        if (t2 > state.endTimeSec) {
          const delta = t2 - state.endTimeSec;
          t1 -= delta;
          t2 -= delta;
        }
        if (t1 < state.startTimeSec) {
          const delta = state.startTimeSec - t1;
          t1 += delta;
          t2 += delta;
        }
        if (t2 > state.endTimeSec) {
          t2 = state.endTimeSec;
        }
      }

      return {
        ...state,
        visibleStartTimeSec: t1,
        visibleEndTimeSec: t2,
      };
    }
    case "translateVisibleTimeRangeFrac": {
      let t1 = state.visibleStartTimeSec;
      let t2 = state.visibleEndTimeSec;
      if (t1 === undefined || t2 === undefined) {
        return state;
      }
      const visibleDuration = t2 - t1;
      const deltaT = visibleDuration * action.frac;
      t1 += deltaT;
      t2 += deltaT;

      // ensure that the new visible time range is within the bounds
      if (state.endTimeSec !== undefined && state.startTimeSec !== undefined) {
        if (t2 > state.endTimeSec) {
          const delta = t2 - state.endTimeSec;
          t1 -= delta;
          t2 -= delta;
        }
        if (t1 < state.startTimeSec) {
          const delta = state.startTimeSec - t1;
          t1 += delta;
          t2 += delta;
        }
        if (t2 > state.endTimeSec) {
          t2 = state.endTimeSec;
        }
      }

      return {
        ...state,
        visibleStartTimeSec: t1,
        visibleEndTimeSec: t2,
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
  if (!context)
    throw new Error(
      "useTimeseriesSelection must be used within a TimeseriesSelectionContext",
    );
  const dispatch = context.dispatch;

  const initializeTimeseriesSelection = useCallback(
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
    [dispatch],
  );

  const setVisibleTimeRange = useCallback(
    (visibleStartTimeSec: number, visibleEndTimeSec: number) => {
      dispatch({
        type: "setVisibleTimeRange",
        visibleStartTimeSec,
        visibleEndTimeSec,
      });
    },
    [dispatch],
  );

  const setCurrentTime = useCallback(
    (currentTime: number | undefined) => {
      dispatch({ type: "setCurrentTime", currentTime });
    },
    [dispatch],
  );

  const zoomVisibleTimeRange = useCallback(
    (factor: number) => {
      dispatch({
        type: "zoomVisibleTimeRange",
        factor,
      });
    },
    [dispatch],
  );

  const translateVisibleTimeRangeFrac = useCallback(
    (frac: number) => {
      dispatch({
        type: "translateVisibleTimeRangeFrac",
        frac,
      });
    },
    [dispatch],
  );

  if (context === undefined) {
    throw new Error(
      "useTimeseriesSelection must be used within a TimeseriesSelectionContext.Provider",
    );
  }
  return {
    initializeTimeseriesSelection,
    setVisibleTimeRange,
    setCurrentTime,
    zoomVisibleTimeRange,
    translateVisibleTimeRangeFrac,
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
  const panTimeseriesSelectionVisibleStartTimeSec = useCallback(
    (vst: number) => {
      if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
        return;
      const currentVisibleDuration = visibleEndTimeSec - visibleStartTimeSec;
      const newVisibleStartTimeSec = vst;
      const newVisibleEndTimeSec =
        newVisibleStartTimeSec + currentVisibleDuration;
      setVisibleTimeRange(newVisibleStartTimeSec, newVisibleEndTimeSec);
    },
    [visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange],
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
    panTimeseriesSelectionVisibleStartTimeSec,
    setCurrentTimeFraction,
  };
};
