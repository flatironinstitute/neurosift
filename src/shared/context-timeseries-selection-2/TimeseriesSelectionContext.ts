import React, { useCallback, useContext, useEffect } from "react";

type ZoomDirection = "in" | "out";
type PanDirection = "forward" | "back";
const defaultZoomScaleFactor = 1.4;

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

// for backward compatibility
const zoomTime = (
  state: {
    visibleStartTimeSec: number | undefined;
    visibleEndTimeSec: number | undefined;
    currentTime: number | undefined;
    startTimeSec: number | undefined;
    endTimeSec: number | undefined;
  },
  direction: ZoomDirection,
  factor?: number,
  hoverTimeSec?: number,
): { visibleStartTimeSec?: number; visibleEndTimeSec?: number } => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.startTimeSec === undefined ||
    state.endTimeSec === undefined
  ) {
    console.warn(
      `WARNING: * Attempt to call zoomTime() with uninitialized state ${state}.`,
    );
    return {
      visibleStartTimeSec: state.visibleStartTimeSec,
      visibleEndTimeSec: state.visibleEndTimeSec,
    };
  }
  const totalTimeseriesLength = state.endTimeSec - state.startTimeSec;
  const currentWindow = state.visibleEndTimeSec - state.visibleStartTimeSec;

  // short-circuit: if we're trying to zoom out from the full timeseries, just return the current state
  if (currentWindow === totalTimeseriesLength && direction === "out")
    return {
      visibleStartTimeSec: state.startTimeSec,
      visibleEndTimeSec: state.endTimeSec,
    };
  // (No such shortcut is available while zooming in--we can always zoom in more.)

  let factor2 = factor ?? defaultZoomScaleFactor;
  // zoom in --> shrink the window. zoom out --> expand the window. So when zooming in we use the inverse of the (>=1) factor.
  factor2 = direction === "in" ? 1 / factor2 : factor2;
  const newWindow = Math.min(currentWindow * factor2, totalTimeseriesLength);

  // We can short-circuit some potential edge cases & needless computation around focus time if we catch the case where
  // the new window is too big.
  // TODO: This should probably be "within some epsilon of" to deal with rounding issues...
  if (newWindow >= totalTimeseriesLength)
    return {
      ...state,
      visibleStartTimeSec: state.startTimeSec,
      visibleEndTimeSec: state.endTimeSec,
    };

  const anchorTimeSec =
    hoverTimeSec !== undefined
      ? hoverTimeSec
      : (state.currentTime ?? state.visibleStartTimeSec + currentWindow / 2);

  // Find the distance of the focus from the window start, as a fraction of the total window length.
  const anchorTimeFrac =
    (anchorTimeSec - state.visibleStartTimeSec) / currentWindow;
  // Now the new start time = anchor time - (fraction * new window size), unless that'd put us earlier than the start of the timeseries.
  let newStart = Math.max(
    anchorTimeSec - anchorTimeFrac * newWindow,
    state.startTimeSec,
  );
  const newEnd = Math.min(newStart + newWindow, state.endTimeSec);
  // Setting the end might also have bumped up against the end of the timeseries. If we were to cap the end time at the timeseries length
  // but keep the first-computed start time, the window would be too small & we'd have zoomed in too much.
  // So we have to do one more start-time correction (which is safe--newWindow is less than the full timeseries length.)
  newStart = newEnd - newWindow;
  return {
    visibleStartTimeSec: newStart,
    visibleEndTimeSec: newEnd,
  };
};
const panTimeHelper = (
  state: {
    visibleStartTimeSec: number | undefined;
    visibleEndTimeSec: number | undefined;
    startTimeSec: number | undefined;
    endTimeSec: number | undefined;
    currentTime: number | undefined;
  },
  panDisplacementSeconds: number,
) => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.startTimeSec === undefined ||
    state.endTimeSec === undefined
  ) {
    console.warn(
      `WARNING: Attempt to call panTime() with uninitialized state ${state}.`,
    );
    return state;
  }
  const windowLength = state.visibleEndTimeSec - state.visibleStartTimeSec;
  let newStart = state.visibleStartTimeSec;
  let newEnd = state.visibleEndTimeSec;
  if (panDisplacementSeconds > 0) {
    // panning forward. Just need to check that we don't run over the end of the timeseries.
    newEnd = Math.min(
      state.visibleEndTimeSec + panDisplacementSeconds,
      state.endTimeSec,
    );
    newStart = Math.max(newEnd - windowLength, state.startTimeSec);
  } else if (panDisplacementSeconds < 0) {
    // panning backward. Need to make sure not to put the window start time before the timeseries start time.
    newStart = Math.max(
      state.visibleStartTimeSec + panDisplacementSeconds,
      state.startTimeSec,
    );
    newEnd = Math.min(newStart + windowLength, state.endTimeSec);
  } else {
    return state;
  }
  const keepFocus = true;
  // const keepFocus = state.currentTimeSec && state.currentTimeSec > newStart && state.currentTimeSec < newEnd
  const currentTime = keepFocus ? state.currentTime : undefined;

  // Avoid creating new object if we didn't actually change anything
  if (
    newStart === state.visibleStartTimeSec &&
    newEnd === state.visibleEndTimeSec
  )
    return state;

  // console.log(`Returning new state: ${newStart} - ${newEnd} (was ${state.visibleStartTimeSec} - ${state.visibleEndTimeSec})`)
  return {
    ...state,
    visibleStartTimeSec: newStart,
    visibleEndTimeSec: newEnd,
    currentTimeSec: currentTime,
  };
};
const panTime = (
  state: {
    visibleStartTimeSec: number | undefined;
    visibleEndTimeSec: number | undefined;
    startTimeSec: number | undefined;
    endTimeSec: number | undefined;
    currentTime: number | undefined;
  },
  action: { panAmountPct: number; type: PanDirection },
): { visibleStartTimeSec?: number; visibleEndTimeSec?: number } => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.startTimeSec === undefined ||
    state.endTimeSec === undefined
  ) {
    console.warn(
      `WARNING: * Attempt to call panTime() with uninitialized state ${state}.`,
    );
    return {
      visibleStartTimeSec: state.visibleStartTimeSec,
      visibleEndTimeSec: state.visibleEndTimeSec,
    };
  }
  const windowLength = state.visibleEndTimeSec - state.visibleStartTimeSec;
  const panDisplacementSeconds =
    (action.panAmountPct / 100) *
    windowLength *
    (action.type === "back" ? -1 : 1);
  return panTimeHelper(state, panDisplacementSeconds);
};
const panTimeDeltaT = (
  state: {
    visibleStartTimeSec: number | undefined;
    visibleEndTimeSec: number | undefined;
    startTimeSec: number | undefined;
    endTimeSec: number | undefined;
    currentTime: number | undefined;
  },
  action: { deltaT: number },
): { visibleStartTimeSec?: number; visibleEndTimeSec?: number } => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.startTimeSec === undefined ||
    state.endTimeSec === undefined
  ) {
    console.warn(
      `WARNING: Attempt to call panTime() with uninitialized state ${state}.`,
    );
    return state;
  }
  const panDisplacementSeconds = action.deltaT;
  return panTimeHelper(state, panDisplacementSeconds);
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
