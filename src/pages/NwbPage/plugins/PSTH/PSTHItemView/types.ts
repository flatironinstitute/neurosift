/* eslint-disable @typescript-eslint/no-explicit-any */
export type PSTHTrialAlignedSeriesMode = "psth" | "time-aligned-series";

export type PSTHPrefs = {
  showRaster: boolean;
  showHist: boolean;
  smoothedHist: boolean;
  height: "small" | "medium" | "large";
  numBins: number;
};

export type PSTHPrefsAction =
  | {
      type: "SET_PREF";
      key: keyof PSTHPrefs;
      value: any;
    }
  | {
      type: "TOGGLE_PREF";
      key: keyof PSTHPrefs;
    };

export const defaultPSTHPrefs: PSTHPrefs = {
  showRaster: true,
  showHist: true,
  smoothedHist: false,
  height: "medium",
  numBins: 30,
};
