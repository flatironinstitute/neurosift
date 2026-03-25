import { useCallback, useState } from "react";
import PSTHItemView from "./PSTHItemView/PSTHItemView";
import {
  decodeStateFromStateString,
  encodeStateToString,
} from "./PSTHItemView/utils/stateEncoding";

type Props = {
  nwbUrl: string;
  path: string;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

/* eslint-disable @typescript-eslint/no-explicit-any */

const readHashParams = (): URLSearchParams => {
  const hash = window.location.hash;
  return new URLSearchParams(hash ? hash.substring(1) : "");
};

const stateFromHashParams = (): string | undefined => {
  const p = readHashParams();
  const state: Record<string, any> = {};
  let hasAny = false;

  const units = p.get("units");
  if (units) {
    hasAny = true;
    if (units === "all") {
      state.selectedUnitIds = "__all__";
    } else {
      state.selectedUnitIds = units.split(",").map((x) => {
        const n = Number(x);
        return isNaN(n) ? x : n;
      });
    }
  }

  const alignTo = p.get("alignTo");
  if (alignTo) {
    hasAny = true;
    state.alignToVariables = alignTo.split(",");
  }

  const groupBy = p.get("groupBy");
  if (groupBy) {
    hasAny = true;
    state.groupByVariable = groupBy;
  }

  const categories = p.get("categories");
  if (categories) {
    hasAny = true;
    state.groupByVariableCategories = categories.split(",");
  }

  const wStart = p.get("windowStart");
  const wEnd = p.get("windowEnd");
  if (wStart !== null && wEnd !== null) {
    hasAny = true;
    state.windowRangeStr = { start: wStart, end: wEnd };
  }

  const sortBy = p.get("sortBy");
  const sortDir = p.get("sortDir");
  if (sortBy) {
    hasAny = true;
    state.sortUnitsByVariable = [sortBy, (sortDir as "asc" | "desc") || "asc"];
  }

  const showRaster = p.get("showRaster");
  const showHist = p.get("showHist");
  const smoothed = p.get("smoothed");
  const numBins = p.get("numBins");
  const height = p.get("plotHeight");
  if (showRaster !== null || showHist !== null || smoothed !== null || numBins !== null || height !== null) {
    hasAny = true;
    state.prefs = {
      showRaster: showRaster !== "0",
      showHist: showHist !== "0",
      smoothedHist: smoothed === "1",
      numBins: numBins ? parseInt(numBins) : 30,
      height: height || "small",
    };
  }

  if (!hasAny) return undefined;
  return encodeStateToString(state);
};

const writeHashParams = (stateString: string) => {
  const state = decodeStateFromStateString(stateString);
  if (!state) return;

  const p = readHashParams();

  // Clear old PSTH params
  for (const key of ["units", "alignTo", "groupBy", "categories", "windowStart", "windowEnd", "sortBy", "sortDir", "showRaster", "showHist", "smoothed", "numBins", "plotHeight"]) {
    p.delete(key);
  }

  // Units
  if (state.selectedUnitIds === "__all__") {
    p.set("units", "all");
  } else if (Array.isArray(state.selectedUnitIds) && state.selectedUnitIds.length > 0) {
    p.set("units", state.selectedUnitIds.join(","));
  }

  // Align to
  if (state.alignToVariables && state.alignToVariables.length > 0) {
    p.set("alignTo", state.alignToVariables.join(","));
  }

  // Group by
  if (state.groupByVariable) {
    p.set("groupBy", state.groupByVariable);
  }
  if (state.groupByVariableCategories && state.groupByVariableCategories.length > 0) {
    p.set("categories", state.groupByVariableCategories.join(","));
  }

  // Window range
  if (state.windowRangeStr) {
    p.set("windowStart", state.windowRangeStr.start);
    p.set("windowEnd", state.windowRangeStr.end);
  }

  // Sort
  if (state.sortUnitsByVariable) {
    p.set("sortBy", state.sortUnitsByVariable[0]);
    p.set("sortDir", state.sortUnitsByVariable[1]);
  }

  // Prefs
  if (state.prefs) {
    p.set("showRaster", state.prefs.showRaster ? "1" : "0");
    p.set("showHist", state.prefs.showHist ? "1" : "0");
    p.set("smoothed", state.prefs.smoothedHist ? "1" : "0");
    p.set("numBins", String(state.prefs.numBins));
    p.set("plotHeight", state.prefs.height);
  }

  const newHash = "#" + p.toString();
  if (window.location.hash !== newHash) {
    window.history.replaceState(null, "", newHash);
  }
};

const PSTHView = ({ nwbUrl, path, secondaryPaths, width, height }: Props) => {
  const [initialStateString] = useState<string | undefined>(() =>
    stateFromHashParams(),
  );

  const setStateString = useCallback((stateString: string) => {
    writeHashParams(stateString);
  }, []);

  return (
    <PSTHItemView
      width={width || 800}
      height={height || 800}
      nwbUrl={nwbUrl}
      path={path}
      additionalPaths={secondaryPaths}
      initialStateString={initialStateString}
      setStateString={setStateString}
    />
  );
};

export default PSTHView;
