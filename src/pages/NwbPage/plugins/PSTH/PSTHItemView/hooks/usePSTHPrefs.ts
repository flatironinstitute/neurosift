import { useReducer } from "react";
import { PSTHPrefs, PSTHPrefsAction } from "../types";

const defaultPSTHPrefs: PSTHPrefs = {
  showRaster: true,
  showHist: true,
  smoothedHist: false,
  height: "medium",
  numBins: 50,
};

const psthPrefsReducer = (
  state: PSTHPrefs,
  action: PSTHPrefsAction,
): PSTHPrefs => {
  switch (action.type) {
    case "SET_PREF":
      return { ...state, [action.key]: action.value };
    case "TOGGLE_PREF":
      return { ...state, [action.key]: !state[action.key] };
    default:
      return state;
  }
};

export const usePSTHPrefs = () => {
  const [prefs, prefsDispatch] = useReducer(psthPrefsReducer, defaultPSTHPrefs);

  return {
    prefs,
    prefsDispatch,
    defaultPSTHPrefs,
  };
};

export type { PSTHPrefs, PSTHPrefsAction };
