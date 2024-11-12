import React, { useCallback, useContext, useEffect } from "react";

export type TimeseriesSelection = {
  timeseriesStartTimeSec?: number;
  timeseriesEndTimeSec?: number;
  currentTimeSec?: number;
  currentTimeIntervalSec?: [number, number];
  visibleStartTimeSec?: number;
  visibleEndTimeSec?: number;
  selectedElectrodeIds?: (number | string)[];
};

export const defaultTimeseriesSelection: TimeseriesSelection = {};

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
export const stubTimeseriesSelectionDispatch = (
  action: TimeseriesSelectionAction,
) => {};

export const selectionIsValid = (r: TimeseriesSelection) => {
  // // If any of the required times are unset, the state is not valid.
  // if (r.timeseriesStartTimeSec === undefined
  //     || r.timeseriesEndTimeSec === undefined
  //     || r.visibleEndTimeSec === undefined
  //     || r.visibleStartTimeSec === undefined) {
  //         return false
  //     }
  // // timeseries start and end times must be non-negative
  // if (r.timeseriesStartTimeSec < 0 || r.timeseriesEndTimeSec < 0) return false

  const {
    timeseriesStartTimeSec,
    timeseriesEndTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = r;

  // timeseries end time must not precede timeseries start time
  if (
    timeseriesStartTimeSec !== undefined &&
    timeseriesEndTimeSec !== undefined
  ) {
    if (timeseriesEndTimeSec < timeseriesStartTimeSec) return false;
  }

  // window end time must not precede window start time
  if (visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined) {
    if (visibleEndTimeSec < visibleStartTimeSec) return false;
  }

  // window times must be within timeseries times.
  // Since we already know timeseries start < timeseries end and visible start < visible end,
  // we can get away with just comparing visible start to timeseries start and visible end to timeseries end.
  // (b/c if visEnd < recStart, then visStart < recStart; if visStart > recEnd, then visEnd > recEnd.)

  // if (timeseriesStartTimeSec !== undefined && visibleStartTimeSec !== undefined && timeseriesEndTimeSec !== undefined && visibleEndTimeSec !== undefined) {
  //     if (visibleStartTimeSec < timeseriesStartTimeSec || timeseriesEndTimeSec < visibleEndTimeSec) {
  //         return false
  //     }
  // }

  // if (r.currentTimeSec) {
  //     // if set, current time must be within the visible window
  //     if (r.currentTimeSec < r.visibleStartTimeSec || r.currentTimeSec > r.visibleEndTimeSec) return false
  // }

  return true;
};

type TimeseriesSelectionContextType = {
  timeseriesSelection: TimeseriesSelection;
  timeseriesSelectionDispatch: (action: TimeseriesSelectionAction) => void;
};

const TimeseriesSelectionContext =
  React.createContext<TimeseriesSelectionContextType>({
    timeseriesSelection: defaultTimeseriesSelection,
    timeseriesSelectionDispatch: stubTimeseriesSelectionDispatch,
  });

export const useTimeseriesSelectionInitialization = (
  start: number | undefined,
  end: number | undefined,
  timeOffset = 0,
) => {
  const { timeseriesSelection, timeseriesSelectionDispatch } = useContext(
    TimeseriesSelectionContext,
  );

  useEffect(() => {
    if (start === undefined || end === undefined) return;
    if (
      timeseriesSelection.timeseriesStartTimeSec === start + timeOffset &&
      timeseriesSelection.timeseriesEndTimeSec === end + timeOffset
    )
      return;

    timeseriesSelectionDispatch({
      type: "initializeTimeseriesSelectionTimes",
      timeseriesStartSec: start + timeOffset,
      timeseriesEndSec: end + timeOffset,
    });
  }, [
    timeseriesSelection.timeseriesStartTimeSec,
    timeseriesSelection.timeseriesEndTimeSec,
    timeseriesSelectionDispatch,
    start,
    end,
    timeOffset,
  ]);
};

export type ZoomDirection = "in" | "out";
export type PanDirection = "forward" | "back";
export const useTimeRange = (timestampOffset = 0) => {
  const { timeseriesSelection, timeseriesSelectionDispatch } = useContext(
    TimeseriesSelectionContext,
  );
  if (
    timeseriesSelection.visibleEndTimeSec === undefined ||
    timeseriesSelection.visibleStartTimeSec === undefined
  ) {
    // console.warn('WARNING: useTimeRange() with uninitialized timeseries selection state. Time ranges replaced with MIN_SAFE_INTEGER.')
  }
  const zoomTimeseriesSelection = useCallback(
    (direction: ZoomDirection, factor?: number, hoverTimeSec?: number) => {
      timeseriesSelectionDispatch({
        type: direction === "in" ? "zoomIn" : "zoomOut",
        factor,
        hoverTimeSec,
      });
    },
    [timeseriesSelectionDispatch],
  );
  const panTimeseriesSelection = useCallback(
    (direction: PanDirection, pct?: number) => {
      timeseriesSelectionDispatch({
        type: direction === "forward" ? "panForward" : "panBack",
        panAmountPct: pct ?? defaultPanPct,
      });
    },
    [timeseriesSelectionDispatch],
  );
  const panTimeseriesSelectionDeltaT = useCallback(
    (deltaT: number) => {
      timeseriesSelectionDispatch({
        type: "panDeltaT",
        deltaT,
      });
    },
    [timeseriesSelectionDispatch],
  );
  const setVisibleTimeRange = useCallback(
    (startTimeSec: number | undefined, endTimeSec: number | undefined) => {
      timeseriesSelectionDispatch({
        type: "setVisibleTimeRange",
        startTimeSec,
        endTimeSec,
      });
    },
    [timeseriesSelectionDispatch],
  );
  return {
    visibleStartTimeSec:
      timeseriesSelection.visibleStartTimeSec !== undefined
        ? timeseriesSelection.visibleStartTimeSec - timestampOffset
        : undefined,
    visibleEndTimeSec:
      timeseriesSelection.visibleEndTimeSec !== undefined
        ? timeseriesSelection.visibleEndTimeSec - timestampOffset
        : undefined,
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    panTimeseriesSelectionDeltaT,
    setVisibleTimeRange,
  };
};

export const useTimeseriesSelection = () => {
  const { timeseriesSelection, timeseriesSelectionDispatch } = useContext(
    TimeseriesSelectionContext,
  );
  const timeForFraction = useCallback(
    (fraction: number) => {
      const window =
        (timeseriesSelection.visibleEndTimeSec || 0) -
        (timeseriesSelection.visibleStartTimeSec || 0);
      const time = window * fraction;
      return time + (timeseriesSelection.visibleStartTimeSec || 0);
    },
    [
      timeseriesSelection.visibleStartTimeSec,
      timeseriesSelection.visibleEndTimeSec,
    ],
  );
  const setCurrentTime = useCallback(
    (time: number, o: { autoScrollVisibleTimeRange?: boolean } = {}) => {
      timeseriesSelectionDispatch({
        type: "setFocusTime",
        currentTimeSec: time,
        autoScrollVisibleTimeRange: o.autoScrollVisibleTimeRange,
      });
    },
    [timeseriesSelectionDispatch],
  );
  const setCurrentTimeFraction = useCallback(
    (fraction: number, opts: { event: React.MouseEvent }) => {
      if (fraction > 1 || fraction < 0) {
        console.warn(
          `Attempt to set time focus to fraction outside range 0-1 (${fraction})`,
        );
        return;
      }

      timeseriesSelectionDispatch({
        type: "setFocusTime",
        currentTimeSec: timeForFraction(fraction),
        shiftKey: opts.event.shiftKey,
      });
    },
    [timeseriesSelectionDispatch, timeForFraction],
  );
  const currentTimeIsVisible =
    timeseriesSelection.currentTimeSec !== undefined &&
    timeseriesSelection.currentTimeSec <=
      (timeseriesSelection.visibleEndTimeSec || 0) &&
    timeseriesSelection.currentTimeSec >=
      (timeseriesSelection.visibleStartTimeSec || 0);
  return {
    currentTime: timeseriesSelection.currentTimeSec,
    currentTimeIsVisible,
    currentTimeInterval: timeseriesSelection.currentTimeIntervalSec,
    setCurrentTime,
    setCurrentTimeFraction,
    timeForFraction,
  };
};

export const useSelectedElectrodes = () => {
  const { timeseriesSelection, timeseriesSelectionDispatch } = useContext(
    TimeseriesSelectionContext,
  );
  const setSelectedElectrodeIds = useCallback(
    (ids: (number | string)[]) => {
      timeseriesSelectionDispatch({
        type: "setSelectedElectrodeIds",
        selectedIds: ids,
      });
    },
    [timeseriesSelectionDispatch],
  );

  return {
    selectedElectrodeIds: timeseriesSelection.selectedElectrodeIds,
    setSelectedElectrodeIds,
  };
};

/* TimeseriesSelection state management code, probably belongs in a different file *********************** */

type InitializeTimeseriesSelectionTimesAction = {
  type: "initializeTimeseriesSelectionTimes";
  timeseriesStartSec: number;
  timeseriesEndSec: number;
};

const defaultPanPct = 10;
export const defaultZoomScaleFactor = 1.4;

type PanTimeseriesSelectionAction = {
  type: "panForward" | "panBack";
  panAmountPct: number; // how far to pan, as a percent of the current visible window (e.g. 10). Should always be positive.
};

type PanTimeseriesSelectionDeltaTAction = {
  type: "panDeltaT";
  deltaT: number;
};

type ZoomTimeseriesSelectionAction = {
  type: "zoomIn" | "zoomOut";
  factor?: number; // Factor should always be >= 1 (if we zoom in, we'll use the inverse of factor.)
  hoverTimeSec?: number;
};

type SetVisibleTimeRangeAction = {
  type: "setVisibleTimeRange";
  startTimeSec: number | undefined;
  endTimeSec: number | undefined;
};

type SetFocusTimeTimeseriesSelectionAction = {
  type: "setFocusTime";
  currentTimeSec: number;
  shiftKey?: boolean;
  autoScrollVisibleTimeRange?: boolean;
};

type SetFocusTimeIntervalTimeseriesSelectionAction = {
  type: "setFocusTimeInterval";
  currentTimeIntervalSec: [number, number];
  autoScrollVisibleTimeRange?: boolean;
};

type SetSelectedElectrodeIdsTimeseriesSelectionAction = {
  type: "setSelectedElectrodeIds";
  selectedIds: (number | string)[];
};

export type TimeseriesSelectionAction =
  | InitializeTimeseriesSelectionTimesAction
  | PanTimeseriesSelectionAction
  | PanTimeseriesSelectionDeltaTAction
  | ZoomTimeseriesSelectionAction
  | SetVisibleTimeRangeAction
  | SetFocusTimeTimeseriesSelectionAction
  | SetFocusTimeIntervalTimeseriesSelectionAction
  | SetSelectedElectrodeIdsTimeseriesSelectionAction;

export const timeseriesSelectionReducer = (
  state: TimeseriesSelection,
  action: TimeseriesSelectionAction,
): TimeseriesSelection => {
  if (action.type === "initializeTimeseriesSelectionTimes") {
    return initializeTimeseriesSelectionTimes(state, action);
  } else if (action.type === "panForward" || action.type === "panBack") {
    return panTime(state, action);
  } else if (action.type === "panDeltaT") {
    return panTimeDeltaT(state, action);
  } else if (action.type === "zoomIn" || action.type === "zoomOut") {
    return zoomTime(state, action);
  } else if (action.type === "setVisibleTimeRange") {
    return setVisibleTimeRange(state, action);
  } else if (action.type === "setFocusTime") {
    return setFocusTime(state, action);
  } else if (action.type === "setFocusTimeInterval") {
    return setFocusTimeInterval(state, action);
  } else if (action.type === "setSelectedElectrodeIds") {
    return setSelectedElectrodeIds(state, action);
  } else {
    console.warn(
      `Unhandled timeseries selection action ${action.type} in timeseriesSelectionReducer.`,
    );
    return state;
  }
};

const initializeTimeseriesSelectionTimes = (
  state: TimeseriesSelection,
  action: InitializeTimeseriesSelectionTimesAction,
): TimeseriesSelection => {
  const newStart =
    state.timeseriesStartTimeSec === undefined
      ? action.timeseriesStartSec
      : Math.min(state.timeseriesStartTimeSec, action.timeseriesStartSec);
  const newEnd =
    state.timeseriesEndTimeSec === undefined
      ? action.timeseriesEndSec
      : Math.max(state.timeseriesEndTimeSec, action.timeseriesEndSec);
  const newState: TimeseriesSelection = {
    ...state,
    timeseriesStartTimeSec: newStart,
    timeseriesEndTimeSec: newEnd,
    visibleStartTimeSec:
      state.visibleStartTimeSec === undefined
        ? newStart
        : state.visibleStartTimeSec,
    visibleEndTimeSec:
      state.visibleEndTimeSec === undefined ? newEnd : state.visibleEndTimeSec,
    selectedElectrodeIds: state.selectedElectrodeIds,
  };
  selectionIsValid(newState) ||
    console.warn(
      `Bad initialization value for timeseriesSelection: start ${action.timeseriesStartSec}, end ${action.timeseriesEndSec}`,
    );
  return newState;
};

const panTimeHelper = (
  state: TimeseriesSelection,
  panDisplacementSeconds: number,
) => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.timeseriesStartTimeSec === undefined ||
    state.timeseriesEndTimeSec === undefined
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
      state.timeseriesEndTimeSec,
    );
    newStart = Math.max(newEnd - windowLength, state.timeseriesStartTimeSec);
  } else if (panDisplacementSeconds < 0) {
    // panning backward. Need to make sure not to put the window start time before the timeseries start time.
    newStart = Math.max(
      state.visibleStartTimeSec + panDisplacementSeconds,
      state.timeseriesStartTimeSec,
    );
    newEnd = Math.min(newStart + windowLength, state.timeseriesEndTimeSec);
  } else {
    return state;
  }
  const keepFocus = true;
  // const keepFocus = state.currentTimeSec && state.currentTimeSec > newStart && state.currentTimeSec < newEnd
  const currentTime = keepFocus ? state.currentTimeSec : undefined;

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
  state: TimeseriesSelection,
  action: PanTimeseriesSelectionAction,
): TimeseriesSelection => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.timeseriesStartTimeSec === undefined ||
    state.timeseriesEndTimeSec === undefined
  ) {
    console.warn(
      `WARNING: Attempt to call panTime() with uninitialized state ${state}.`,
    );
    return state;
  }
  const windowLength = state.visibleEndTimeSec - state.visibleStartTimeSec;
  const panDisplacementSeconds =
    (action.panAmountPct / 100) *
    windowLength *
    (action.type === "panBack" ? -1 : 1);
  return panTimeHelper(state, panDisplacementSeconds);
};

const panTimeDeltaT = (
  state: TimeseriesSelection,
  action: PanTimeseriesSelectionDeltaTAction,
): TimeseriesSelection => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.timeseriesStartTimeSec === undefined ||
    state.timeseriesEndTimeSec === undefined
  ) {
    console.warn(
      `WARNING: Attempt to call panTime() with uninitialized state ${state}.`,
    );
    return state;
  }
  const panDisplacementSeconds = action.deltaT;
  return panTimeHelper(state, panDisplacementSeconds);
};

const zoomTime = (
  state: TimeseriesSelection,
  action: ZoomTimeseriesSelectionAction,
): TimeseriesSelection => {
  if (
    state.visibleStartTimeSec === undefined ||
    state.visibleEndTimeSec === undefined ||
    state.timeseriesStartTimeSec === undefined ||
    state.timeseriesEndTimeSec === undefined
  ) {
    console.warn(
      `WARNING: Attempt to call zoomTime() with uninitialized state ${state}.`,
    );
    return state;
  }
  const totalTimeseriesLength =
    state.timeseriesEndTimeSec - state.timeseriesStartTimeSec;
  const currentWindow = state.visibleEndTimeSec - state.visibleStartTimeSec;

  // short-circuit: if we're trying to zoom out from the full timeseries, just return the current state
  if (currentWindow === totalTimeseriesLength && action.type === "zoomOut")
    return state;
  // (No such shortcut is available while zooming in--we can always zoom in more.)

  let factor = action.factor ?? defaultZoomScaleFactor;
  // zoom in --> shrink the window. zoom out --> expand the window. So when zooming in we use the inverse of the (>=1) factor.
  factor = action.type === "zoomIn" ? 1 / factor : factor;
  const newWindow = Math.min(currentWindow * factor, totalTimeseriesLength);

  // We can short-circuit some potential edge cases & needless computation around focus time if we catch the case where
  // the new window is too big.
  // TODO: This should probably be "within some epsilon of" to deal with rounding issues...
  if (newWindow >= totalTimeseriesLength)
    return {
      ...state,
      visibleStartTimeSec: state.timeseriesStartTimeSec,
      visibleEndTimeSec: state.timeseriesEndTimeSec,
    };

  const anchorTimeSec =
    action.hoverTimeSec !== undefined
      ? action.hoverTimeSec
      : (state.currentTimeSec ?? state.visibleStartTimeSec + currentWindow / 2);

  // Find the distance of the focus from the window start, as a fraction of the total window length.
  const anchorTimeFrac =
    (anchorTimeSec - state.visibleStartTimeSec) / currentWindow;
  // Now the new start time = anchor time - (fraction * new window size), unless that'd put us earlier than the start of the timeseries.
  let newStart = Math.max(
    anchorTimeSec - anchorTimeFrac * newWindow,
    state.timeseriesStartTimeSec,
  );
  const newEnd = Math.min(newStart + newWindow, state.timeseriesEndTimeSec);
  // Setting the end might also have bumped up against the end of the timeseries. If we were to cap the end time at the timeseries length
  // but keep the first-computed start time, the window would be too small & we'd have zoomed in too much.
  // So we have to do one more start-time correction (which is safe--newWindow is less than the full timeseries length.)
  newStart = newEnd - newWindow;
  return {
    ...state,
    visibleStartTimeSec: newStart,
    visibleEndTimeSec: newEnd,
  };
};

const setVisibleTimeRange = (
  state: TimeseriesSelection,
  action: SetVisibleTimeRangeAction,
): TimeseriesSelection => {
  return {
    ...state,
    visibleStartTimeSec: action.startTimeSec,
    visibleEndTimeSec: action.endTimeSec,
  };
};

const setFocusTime = (
  state: TimeseriesSelection,
  action: SetFocusTimeTimeseriesSelectionAction,
): TimeseriesSelection => {
  const { currentTimeSec, shiftKey, autoScrollVisibleTimeRange } = action;
  let newState: TimeseriesSelection = {
    ...state,
    currentTimeSec: currentTimeSec,
    currentTimeIntervalSec: undefined,
  };
  if (autoScrollVisibleTimeRange) {
    if (
      state.visibleStartTimeSec !== undefined &&
      state.visibleEndTimeSec !== undefined
    ) {
      if (
        currentTimeSec < state.visibleStartTimeSec ||
        currentTimeSec > state.visibleEndTimeSec
      ) {
        const span = state.visibleEndTimeSec - state.visibleStartTimeSec;
        newState.visibleStartTimeSec = currentTimeSec - span / 2;
        newState.visibleEndTimeSec = currentTimeSec + span / 2;
        if (newState.visibleEndTimeSec > (state.timeseriesEndTimeSec || 0)) {
          const delta =
            (state.timeseriesEndTimeSec || 0) - newState.visibleEndTimeSec;
          newState.visibleStartTimeSec += delta;
          newState.visibleEndTimeSec += delta;
        }
        if (
          newState.visibleStartTimeSec < (state.timeseriesStartTimeSec || 0)
        ) {
          const delta =
            (state.timeseriesStartTimeSec || 0) - newState.visibleStartTimeSec;
          newState.visibleStartTimeSec += delta;
          newState.visibleEndTimeSec += delta;
        }
      }
    }
  }
  if (shiftKey) {
    const t0 = state.currentTimeSec;
    if (t0 !== undefined) {
      const t1 = Math.min(t0, currentTimeSec);
      const t2 = Math.max(t0, currentTimeSec);
      newState = {
        ...newState,
        currentTimeSec: state.currentTimeSec,
        currentTimeIntervalSec: [t1, t2],
      };
    }
  }
  // return selectionIsValid(newState) ? newState : state
  return newState;
};

const setFocusTimeInterval = (
  state: TimeseriesSelection,
  action: SetFocusTimeIntervalTimeseriesSelectionAction,
): TimeseriesSelection => {
  const { currentTimeIntervalSec, autoScrollVisibleTimeRange } = action;
  const newState: TimeseriesSelection = {
    ...state,
    currentTimeIntervalSec: currentTimeIntervalSec,
  };
  if (autoScrollVisibleTimeRange) {
    const t0 =
      (action.currentTimeIntervalSec[0] + action.currentTimeIntervalSec[1]) / 2;
    if (
      state.visibleStartTimeSec !== undefined &&
      state.visibleEndTimeSec !== undefined
    ) {
      if (t0 < state.visibleStartTimeSec || t0 > state.visibleEndTimeSec) {
        const span = state.visibleEndTimeSec - state.visibleStartTimeSec;
        newState.visibleStartTimeSec = t0 - span / 2;
        newState.visibleEndTimeSec = t0 + span / 2;
        if (newState.visibleEndTimeSec > (state.timeseriesEndTimeSec || 0)) {
          const delta =
            (state.timeseriesEndTimeSec || 0) - newState.visibleEndTimeSec;
          newState.visibleStartTimeSec += delta;
          newState.visibleEndTimeSec += delta;
        }
        if (
          newState.visibleStartTimeSec < (state.timeseriesStartTimeSec || 0)
        ) {
          const delta =
            (state.timeseriesStartTimeSec || 0) - newState.visibleStartTimeSec;
          newState.visibleStartTimeSec += delta;
          newState.visibleEndTimeSec += delta;
        }
      }
    }
  }
  return selectionIsValid(newState) ? newState : state;
};

const setSelectedElectrodeIds = (
  state: TimeseriesSelection,
  action: SetSelectedElectrodeIdsTimeseriesSelectionAction,
): TimeseriesSelection => {
  if (action.selectedIds.length === (state.selectedElectrodeIds || []).length) {
    const currentSet = new Set<number | string>(state.selectedElectrodeIds);
    if (action.selectedIds.every((id) => currentSet.has(id))) {
      return state;
    }
  }
  const newState = { ...state, selectedElectrodeIds: action.selectedIds };
  return newState;
};

export default TimeseriesSelectionContext;
