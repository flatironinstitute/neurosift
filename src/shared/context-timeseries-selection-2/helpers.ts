export type ZoomDirection = "in" | "out";
export type PanDirection = "forward" | "back";
const defaultZoomScaleFactor = 1.4;

// for backward compatibility
export const zoomTime = (
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
export const panTime = (
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
export const panTimeDeltaT = (
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
