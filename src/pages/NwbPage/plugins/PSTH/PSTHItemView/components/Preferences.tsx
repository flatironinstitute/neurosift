import { FunctionComponent, useCallback } from "react";
import { PSTHPrefs, PSTHPrefsAction } from "../types";

type PrefsComponentProps = {
  prefs: PSTHPrefs;
  prefsDispatch: (x: PSTHPrefsAction) => void;
  mode: "psth" | "time-aligned-series";
};

const PrefsComponent: FunctionComponent<PrefsComponentProps> = ({
  prefs,
  prefsDispatch,
  mode,
}) => {
  const handleSetNumBins = useCallback(
    (numBins: number) => {
      prefsDispatch({ type: "SET_PREF", key: "numBins", value: numBins });
    },
    [prefsDispatch],
  );

  const handleToggleShowRaster = useCallback(() => {
    prefsDispatch({ type: "TOGGLE_PREF", key: "showRaster" });
  }, [prefsDispatch]);

  const handleToggleShowHist = useCallback(() => {
    prefsDispatch({ type: "TOGGLE_PREF", key: "showHist" });
  }, [prefsDispatch]);

  const handleToggleSmoothedHist = useCallback(() => {
    prefsDispatch({ type: "TOGGLE_PREF", key: "smoothedHist" });
  }, [prefsDispatch]);

  return (
    <div>
      <input
        type="checkbox"
        checked={prefs.showRaster}
        onChange={() => {}}
        onClick={handleToggleShowRaster}
      />{" "}
      Show raster
      <br />
      {mode === "psth" && (
        <>
          <input
            type="checkbox"
            checked={prefs.showHist}
            onChange={() => {}}
            onClick={handleToggleShowHist}
          />{" "}
          Show histogram
          <br />
        </>
      )}
      <NumBinsComponent numBins={prefs.numBins} setNumBins={handleSetNumBins} />
      <br />
      {mode === "psth" && (
        <>
          <input
            type="checkbox"
            checked={prefs.smoothedHist}
            onChange={() => {}}
            onClick={handleToggleSmoothedHist}
          />{" "}
          Smoothed
          <br />
        </>
      )}
      Height:&nbsp;
      <select
        value={prefs.height}
        onChange={(evt) => {
          prefsDispatch({
            type: "SET_PREF",
            key: "height",
            value: evt.target.value,
          });
        }}
      >
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </div>
  );
};

type NumBinsComponentProps = {
  numBins: number;
  setNumBins: (x: number) => void;
};

const NumBinsComponent: FunctionComponent<NumBinsComponentProps> = ({
  numBins,
  setNumBins,
}) => {
  const handleChange = useCallback(
    (value: string) => {
      const val = parseInt(value);
      if (!isNaN(val) && val >= 1 && val <= 1000) {
        setNumBins(val);
      }
    },
    [setNumBins],
  );

  return (
    <span>
      Num. bins:&nbsp;
      <input
        style={{ width: 30 }}
        type="text"
        value={numBins}
        onChange={(evt) => handleChange(evt.target.value)}
      />
    </span>
  );
};

export default PrefsComponent;
