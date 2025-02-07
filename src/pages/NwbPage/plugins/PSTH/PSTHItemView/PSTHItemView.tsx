import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
} from "react";
import {
  UnitSelectionContext,
  defaultUnitSelection,
  sortIds,
  unitSelectionReducer,
} from "@shared/context-unit-selection";
import { useSelectedUnitIds } from "@shared/context-unit-selection/UnitSelectionContext";
import { DirectSpikeTrainsClient } from "./DirectSpikeTrainsClient";
import { useSortUnitsByValues } from "./hooks/useSortUnitsBy";
import { useTrialsFilterIndices } from "./hooks/useTrialsFilter";
import { useRoiClient } from "./ROIClient";
import { PSTHTrialAlignedSeriesMode } from "./types";
import {
  decodeStateFromStateString,
  encodeStateToString,
} from "./utils/stateEncoding";
import { usePSTHPrefs } from "./hooks/usePSTHPrefs";
import PSTHLayout from "./components/PSTHLayout";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
  hidden?: boolean;
  initialStateString?: string;
  setStateString?: (x: string) => void;
  mode?: PSTHTrialAlignedSeriesMode;
};

const PSTHItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
  hidden,
  mode,
}) => {
  const [unitSelection, unitSelectionDispatch] = useReducer(
    unitSelectionReducer,
    defaultUnitSelection,
  );

  return (
    <UnitSelectionContext.Provider
      value={{ unitSelection, unitSelectionDispatch }}
    >
      <PSTHItemViewChild
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
        additionalPaths={additionalPaths}
        initialStateString={initialStateString}
        setStateString={setStateString}
        hidden={hidden}
        mode={mode || "psth"}
      />
    </UnitSelectionContext.Provider>
  );
};

type PSTHItemViewChildProps = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  additionalPaths?: string[];
  initialStateString?: string;
  setStateString?: (x: string) => void;
  hidden?: boolean;
  mode: PSTHTrialAlignedSeriesMode;
};

const PSTHItemViewChild: FunctionComponent<PSTHItemViewChildProps> = ({
  width,
  height,
  nwbUrl,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
  mode,
}) => {
  const { selectedUnitIds: selectedUnitIdsSet, unitIdSelectionDispatch } =
    useSelectedUnitIds();
  const setSelectedUnitIds = useCallback(
    (selectedUnitIds: (number | string)[]) => {
      unitIdSelectionDispatch({
        type: "SET_SELECTION",
        incomingSelectedUnitIds: selectedUnitIds,
      });
    },
    [unitIdSelectionDispatch],
  );

  const selectedUnitIds = useMemo(() => {
    return sortIds([...selectedUnitIdsSet]);
  }, [selectedUnitIdsSet]);

  const [selectedRoiIndices, setSelectedRoiIndices] = useState<number[]>([]);

  const unitsPath = useMemo(
    () =>
      (additionalPaths || []).length === 0
        ? "/units"
        : (additionalPaths || [])[0],
    [additionalPaths],
  );

  const [spikeTrainsClient, setSpikeTrainsClient] = useState<
    DirectSpikeTrainsClient | undefined
  >(undefined);
  useEffect(() => {
    if (mode === "time-aligned-series") {
      setSpikeTrainsClient(undefined);
      return;
    }
    let canceled = false;
    const load = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbUrl, unitsPath);
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, unitsPath, mode]);

  const roiClient = useRoiClient(
    nwbUrl,
    mode === "time-aligned-series" ? path : undefined,
    additionalPaths,
  );

  const unitIds = useMemo(() => {
    if (!spikeTrainsClient) return undefined;
    return spikeTrainsClient.unitIds;
  }, [spikeTrainsClient]);

  const [alignToVariables, setAlignToVariables] = useState<string[]>([
    "start_time",
  ]);
  const [groupByVariable, setGroupByVariable] = useState<string>("");
  const [groupByVariableCategories, setGroupByVariableCategories] = useState<
    string[] | undefined
  >(undefined);
  const [sortUnitsByVariable, setSortUnitsByVariable] = useState<
    [string, "asc" | "desc"] | undefined
  >(undefined);
  const [trialsFilter, setTrialsFilter] = useState<string | undefined>(
    undefined,
  );

  const sortUnitsByValues = useSortUnitsByValues(
    nwbUrl,
    unitsPath,
    sortUnitsByVariable ? sortUnitsByVariable[0] : "",
  );

  const sortUnitsByDirection = useMemo(
    () => (sortUnitsByVariable ? sortUnitsByVariable[1] : "asc"),
    [sortUnitsByVariable],
  );

  const unitIdSortFunction = useCallback(
    (a: string | number, b: string | number) => {
      if (!sortUnitsByValues) return 0;
      const aVal = sortUnitsByValues[a];
      const bVal = sortUnitsByValues[b];
      if (aVal < bVal) return sortUnitsByDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortUnitsByDirection === "asc" ? 1 : -1;
      return 0;
    },
    [sortUnitsByValues, sortUnitsByDirection],
  );

  const sortedUnitIds = useMemo(() => {
    if (!sortUnitsByVariable) return unitIds;
    if (!unitIds) return undefined;
    return [...unitIds].sort(unitIdSortFunction);
  }, [unitIds, sortUnitsByVariable, unitIdSortFunction]);

  const sortedSelectedUnitIds = useMemo(() => {
    if (!sortUnitsByVariable) return selectedUnitIds;
    return [...selectedUnitIds].sort(unitIdSortFunction);
  }, [selectedUnitIds, sortUnitsByVariable, unitIdSortFunction]);

  const [windowRangeStr, setWindowRangeStr] = useState<{
    start: string;
    end: string;
  }>(mode === "psth" ? { start: "-0.5", end: "1" } : { start: "-2", end: "4" });

  const { prefs, prefsDispatch } = usePSTHPrefs();

  useEffect(() => {
    if (mode === "time-aligned-series") {
      prefsDispatch({ type: "SET_PREF", key: "showHist", value: false });
      prefsDispatch({ type: "SET_PREF", key: "smoothedHist", value: false });
    }
  }, [mode, prefsDispatch]);

  useEffect(() => {
    if (!initialStateString) return;
    const a = decodeStateFromStateString(initialStateString);
    if (!a) return;
    if (a.selectedUnitIds) {
      const sortedSelectedUnitIds = [...a.selectedUnitIds].sort();
      setSelectedUnitIds(sortedSelectedUnitIds);
    }
    if (a.selectedRoiIndices) {
      setSelectedRoiIndices(a.selectedRoiIndices);
    }
    if (a.alignToVariables) {
      setAlignToVariables(a.alignToVariables);
    }
    if (a.groupByVariable) {
      setGroupByVariable(a.groupByVariable);
    }
    if (a.groupByVariableCategories) {
      setGroupByVariableCategories(a.groupByVariableCategories);
    }
    if (a.trialsFilter) {
      setTrialsFilter(a.trialsFilter);
    }
    if (a.sortUnitsByVariable) {
      setSortUnitsByVariable(a.sortUnitsByVariable);
    }
    if (a.windowRangeStr) {
      setWindowRangeStr(a.windowRangeStr);
    }
    if (a.prefs) {
      prefsDispatch({
        type: "SET_PREF",
        key: "showRaster",
        value: a.prefs.showRaster,
      });
      prefsDispatch({
        type: "SET_PREF",
        key: "showHist",
        value: a.prefs.showHist,
      });
      prefsDispatch({
        type: "SET_PREF",
        key: "smoothedHist",
        value: a.prefs.smoothedHist,
      });
      prefsDispatch({ type: "SET_PREF", key: "height", value: a.prefs.height });
      prefsDispatch({
        type: "SET_PREF",
        key: "numBins",
        value: a.prefs.numBins,
      });
    }
  }, [initialStateString, setSelectedUnitIds, prefsDispatch]);

  useEffect(() => {
    if (!setStateString) return;
    const state0 = {
      selectedUnitIds,
      selectedRoiIndices,
      alignToVariables,
      groupByVariable,
      groupByVariableCategories,
      trialsFilter,
      sortUnitsByVariable,
      windowRangeStr,
      prefs,
    };
    setStateString(encodeStateToString(state0));
  }, [
    selectedUnitIds,
    selectedRoiIndices,
    setStateString,
    alignToVariables,
    groupByVariable,
    groupByVariableCategories,
    trialsFilter,
    sortUnitsByVariable,
    windowRangeStr,
    prefs,
  ]);

  const rawTrialIndices = useTrialsFilterIndices(trialsFilter, nwbUrl, path);
  const trialIndices = rawTrialIndices === null ? undefined : rawTrialIndices;

  const sortedSelectedRoiIndices = useMemo(() => {
    return selectedRoiIndices.sort();
  }, [selectedRoiIndices]);

  const unitIdsOrRoiIndicesToPlot = useMemo(() => {
    if (mode === "psth") {
      return sortedSelectedUnitIds;
    } else if (mode === "time-aligned-series") {
      return sortedSelectedRoiIndices;
    } else {
      return [];
    }
  }, [mode, sortedSelectedUnitIds, sortedSelectedRoiIndices]);

  return (
    <PSTHLayout
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
      unitsPath={unitsPath}
      mode={mode}
      spikeTrainsClient={spikeTrainsClient}
      roiClient={roiClient} // roiClient is already RoiClient | null from useRoiClient
      sortedUnitIds={sortedUnitIds}
      selectedUnitIds={selectedUnitIds}
      setSelectedUnitIds={setSelectedUnitIds}
      selectedRoiIndices={selectedRoiIndices}
      setSelectedRoiIndices={setSelectedRoiIndices}
      alignToVariables={alignToVariables}
      setAlignToVariables={setAlignToVariables}
      groupByVariable={groupByVariable}
      setGroupByVariable={setGroupByVariable}
      groupByVariableCategories={groupByVariableCategories}
      setGroupByVariableCategories={setGroupByVariableCategories}
      sortUnitsByVariable={sortUnitsByVariable}
      setSortUnitsByVariable={setSortUnitsByVariable}
      sortUnitsByValues={sortUnitsByValues}
      windowRangeStr={windowRangeStr}
      setWindowRangeStr={setWindowRangeStr}
      prefs={prefs}
      prefsDispatch={prefsDispatch}
      trialIndices={trialIndices}
      unitIdsOrRoiIndicesToPlot={unitIdsOrRoiIndicesToPlot}
    />
  );
};

export default PSTHItemView;
