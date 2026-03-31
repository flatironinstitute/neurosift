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
    if (categories === "all") {
      state.groupByVariableCategories = undefined;
    } else {
      state.groupByVariableCategories = categories.split(",");
    }
  }

  const wStart = p.get("windowStart");
  const wEnd = p.get("windowEnd");
  if (wStart !== null || wEnd !== null) {
    hasAny = true;
    state.windowRangeStr = { start: wStart || "-0.5", end: wEnd || "1" };
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
  const plotHeight = p.get("plotHeight");
  if (
    showRaster !== null ||
    showHist !== null ||
    smoothed !== null ||
    numBins !== null ||
    plotHeight !== null
  ) {
    hasAny = true;
    state.prefs = {
      showRaster: showRaster === null ? true : showRaster !== "0",
      showHist: showHist === null ? true : showHist !== "0",
      smoothedHist: smoothed === "1",
      numBins: numBins ? parseInt(numBins) : 50,
      height: plotHeight || "medium",
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
  for (const key of [
    "units",
    "alignTo",
    "groupBy",
    "categories",
    "windowStart",
    "windowEnd",
    "sortBy",
    "sortDir",
    "showRaster",
    "showHist",
    "smoothed",
    "numBins",
    "plotHeight",
  ]) {
    p.delete(key);
  }

  // Units
  if (state.selectedUnitIds === "__all__") {
    p.set("units", "all");
  } else if (
    Array.isArray(state.selectedUnitIds) &&
    state.selectedUnitIds.length > 0
  ) {
    p.set("units", state.selectedUnitIds.join(","));
  }

  // Align to (default: start_time)
  if (state.alignToVariables && state.alignToVariables.length > 0) {
    const isDefault =
      state.alignToVariables.length === 1 &&
      state.alignToVariables[0] === "start_time";
    if (!isDefault) {
      p.set("alignTo", state.alignToVariables.join(","));
    }
  }

  // Group by
  if (state.groupByVariable) {
    p.set("groupBy", state.groupByVariable);
  }
  if (state.groupByVariable) {
    if (!state.groupByVariableCategories) {
      p.set("categories", "all");
    } else if (state.groupByVariableCategories.length > 0) {
      p.set("categories", state.groupByVariableCategories.join(","));
    }
  }

  // Window range (default: -0.5 to 1)
  if (state.windowRangeStr) {
    if (state.windowRangeStr.start !== "-0.5")
      p.set("windowStart", state.windowRangeStr.start);
    if (state.windowRangeStr.end !== "1")
      p.set("windowEnd", state.windowRangeStr.end);
  }

  // Sort (default direction: asc)
  if (state.sortUnitsByVariable) {
    p.set("sortBy", state.sortUnitsByVariable[0]);
    if (state.sortUnitsByVariable[1] !== "asc") {
      p.set("sortDir", state.sortUnitsByVariable[1]);
    }
  }

  // Prefs (only write non-defaults)
  if (state.prefs) {
    if (!state.prefs.showRaster) p.set("showRaster", "0");
    if (!state.prefs.showHist) p.set("showHist", "0");
    if (state.prefs.smoothedHist) p.set("smoothed", "1");
    if (state.prefs.numBins !== 50)
      p.set("numBins", String(state.prefs.numBins));
    if (state.prefs.height !== "medium")
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
