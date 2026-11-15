import { Checkbox, Select, TextInput } from "@ui";
import { FunctionComponent, useState } from "react";
import { PSTHPrefs, PSTHPrefsAction } from "../types";

type PrefsComponentProps = {
  prefs: PSTHPrefs;
  prefsDispatch: (x: PSTHPrefsAction) => void;
  mode: "psth" | "time-aligned-series";
};

/** What each chart draws: raster, histogram, bins and height. */
const PrefsComponent: FunctionComponent<PrefsComponentProps> = ({
  prefs,
  prefsDispatch,
  mode,
}) => {
  const [bins, setBins] = useState(String(prefs.numBins));
  const value = Number(bins);
  const valid = Number.isInteger(value) && value >= 1 && value <= 1000;
  const toggle = (key: "showRaster" | "showHist" | "smoothedHist") =>
    prefsDispatch({ type: "TOGGLE_PREF", key });
  return (
    <>
      <Checkbox
        label="Raster"
        checked={prefs.showRaster}
        onChange={() => toggle("showRaster")}
      />
      {mode === "psth" && (
        <Checkbox
          label="Histogram"
          checked={prefs.showHist}
          onChange={() => toggle("showHist")}
        />
      )}
      {mode === "psth" && (
        <Checkbox
          label="Smoothed"
          checked={prefs.smoothedHist}
          onChange={() => toggle("smoothedHist")}
        />
      )}
      <TextInput
        label="Number of bins"
        size="sm"
        value={bins}
        error={valid ? undefined : "Use between 1 and 1,000 bins."}
        onChange={(next) => {
          setBins(next);
          const n = Number(next);
          if (Number.isInteger(n) && n >= 1 && n <= 1000)
            prefsDispatch({ type: "SET_PREF", key: "numBins", value: n });
        }}
      />
      <Select
        label="Chart height"
        size="sm"
        value={prefs.height}
        onChange={(height) =>
          prefsDispatch({ type: "SET_PREF", key: "height", value: height })
        }
        options={[
          { value: "small", label: "Small" },
          { value: "medium", label: "Medium" },
          { value: "large", label: "Large" },
        ]}
      />
    </>
  );
};

export default PrefsComponent;
