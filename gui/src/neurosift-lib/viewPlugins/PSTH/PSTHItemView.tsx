/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { RemoteH5FileX } from "../../remote-h5-file/index";
import pako from "pako";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  UnitSelectionContext,
  defaultUnitSelection,
  sortIds,
  unitSelectionReducer,
} from "../../contexts/context-unit-selection";
import { useSelectedUnitIds } from "../../contexts/context-unit-selection/UnitSelectionContext";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useGroup } from "../../misc/hooks";
import { DirectSpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";
import IfHasBeenVisible from "./IfHasBeenVisible";
import PSTHUnitWidget from "./PSTHUnitWidget";
import { RoiClient, useRoiClient } from "./ROIClient";

export type PSTHTrialAlignedSeriesMode = "psth" | "time-aligned-series";

type Props = {
  width: number;
  height: number;
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

export type PSTHPrefs = {
  showRaster: boolean;
  showHist: boolean;
  smoothedHist: boolean;
  height: "small" | "medium" | "large";
  numBins: number;
};

type PSTHPrefsAction =
  | {
      type: "SET_PREF";
      key: keyof PSTHPrefs;
      value: any;
    }
  | {
      type: "TOGGLE_PREF";
      key: keyof PSTHPrefs;
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

export const defaultPSTHPrefs: PSTHPrefs = {
  showRaster: true,
  showHist: true,
  smoothedHist: false,
  height: "medium",
  numBins: 30,
};

type PSTHItemViewChildProps = {
  width: number;
  height: number;
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
  path,
  additionalPaths,
  initialStateString,
  setStateString,
  mode,
  hidden,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  // psth mode
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

  // time-aligned-series mode
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
    let canceled = false;
    if (mode === "time-aligned-series") {
      setSpikeTrainsClient(undefined);
      return;
    }
    const load = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbFile, unitsPath);
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, unitsPath, mode]);

  const roiClient = useRoiClient(
    nwbFile,
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

  const sortUnitsByValues: { [unitId: string | number]: any } | undefined =
    useSortUnitsByValues(
      nwbFile,
      unitsPath,
      sortUnitsByVariable ? sortUnitsByVariable[0] : "",
    );

  const sortUnitsByDirection = useMemo(
    () => (sortUnitsByVariable ? sortUnitsByVariable[1] : "asc"),
    [sortUnitsByVariable],
  );
  const unitIdSortFunction = useMemo(
    () => (a: string | number, b: string | number) => {
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
    const sortedUnitIds = [...unitIds].sort(unitIdSortFunction);
    return sortedUnitIds;
  }, [unitIds, sortUnitsByVariable, unitIdSortFunction]);

  const sortedSelectedUnitIds = useMemo(() => {
    if (!sortUnitsByVariable) return selectedUnitIds;
    const sortedSelectedUnitIds = [...selectedUnitIds].sort(unitIdSortFunction);
    return sortedSelectedUnitIds;
  }, [selectedUnitIds, sortUnitsByVariable, unitIdSortFunction]);

  const [windowRangeStr, setWindowRangeStr] = useState<{
    start: string;
    end: string;
  }>(mode === "psth" ? { start: "-0.5", end: "1" } : { start: "-2", end: "4" });
  const windowRange = useMemo(() => {
    const t1 = parseFloat(windowRangeStr.start);
    const t2 = parseFloat(windowRangeStr.end);
    if (isNaN(t1) || isNaN(t2)) return { start: 0, end: 1 };
    if (t1 >= t2) return { start: 0, end: 1 };
    if (mode === "psth") {
      if (t2 - t1 > 20) return { start: 0, end: 1 };
    } else if (mode === "time-aligned-series") {
      if (t2 - t1 > 500) return { start: 0, end: 1 };
    }
    return {
      start: t1,
      end: t2,
    };
  }, [windowRangeStr, mode]);

  const [prefs, prefsDispatch] = useReducer(psthPrefsReducer, defaultPSTHPrefs);
  useEffect(() => {
    // never show hist or smoothed for mode time-aligned-series
    if (mode === "time-aligned-series") {
      prefsDispatch({ type: "SET_PREF", key: "showHist", value: false });
      prefsDispatch({ type: "SET_PREF", key: "smoothedHist", value: false });
    }
  }, [mode]);

  useEffect(() => {
    if (!initialStateString) return;
    const a = decodeStateFromStateString(initialStateString);
    if (!a) return;
    if (a.complementOfSelectedUnitIds) {
      console.warn(
        "Not supporting complementOfSelectedUnitIds because it causes problems with initial state",
      );
      // setSelectedUnitIds(
      //   (sortedUnitIds || []).filter(
      //     (unitId) => !a.complementOfSelectedUnitIds.includes(unitId),
      //   ),
      // );
    } else if (a.selectedUnitIds) {
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
  }, [
    initialStateString,
    setSelectedUnitIds,
    setAlignToVariables,
    setGroupByVariable,
    setGroupByVariableCategories,
    setTrialsFilter,
    setSortUnitsByVariable,
    setWindowRangeStr,
    prefsDispatch,
  ]);

  useEffect(() => {
    if (!setStateString) return;
    const state0: { [key: string]: any } = {
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
    // Not supporting complementOfSelectedUnitIds because it causes problems with initial state
    // if (selectedUnitIds.length > (sortedUnitIds || []).length / 2) {
    //   state0.complementOfSelectedUnitIds = (sortedUnitIds || []).filter(
    //     (unitId) => !selectedUnitIds.includes(unitId),
    //   );
    //   delete state0.selectedUnitIds;
    // }
    setStateString(encodeStateToString(state0));
  }, [
    selectedUnitIds,
    selectedRoiIndices,
    sortedUnitIds,
    setStateString,
    alignToVariables,
    groupByVariable,
    groupByVariableCategories,
    trialsFilter,
    sortUnitsByVariable,
    windowRangeStr,
    prefs,
  ]);

  const unitsTable =
    mode === "psth" ? (
      <UnitSelectionComponent
        unitIds={sortedUnitIds}
        selectedUnitIds={selectedUnitIds}
        setSelectedUnitIds={setSelectedUnitIds}
        sortUnitsByVariable={sortUnitsByVariable}
        sortUnitsByValues={sortUnitsByValues}
      />
    ) : mode === "time-aligned-series" ? (
      <RoiSelectionComponent
        roiClient={roiClient}
        selectedRoiIndices={selectedRoiIndices}
        setSelectedRoiIndices={setSelectedRoiIndices}
      />
    ) : null;

  const alignToSelectionComponent = (
    <AlignToSelectionComponent
      alignToVariables={alignToVariables}
      setAlignToVariables={setAlignToVariables}
      path={path}
    />
  );

  const windowRangeSelectionComponent = (
    <WindowRangeSelectionComponent
      windowRangeStr={windowRangeStr}
      setWindowRangeStr={setWindowRangeStr}
    />
  );

  const groupBySelectionComponent = (
    <GroupBySelectionComponent
      groupByVariable={groupByVariable}
      setGroupByVariable={(v) => {
        setGroupByVariable(v);
        setGroupByVariableCategories(undefined);
      }}
      path={path}
      groupByVariableCategories={groupByVariableCategories}
      setGroupByVariableCategories={setGroupByVariableCategories}
    />
  );

  const sortUnitsBySelectionComponent =
    mode === "psth" ? (
      <SortUnitsBySelectionComponent
        sortUnitsByVariable={sortUnitsByVariable}
        setSortUnitsByVariable={setSortUnitsByVariable}
        unitsPath={unitsPath}
      />
    ) : (
      <></>
    );

  const trialsFilterComponent = (
    <TrialsFilterComponent
      trialsFilter={trialsFilter}
      setTrialsFilter={setTrialsFilter}
    />
  );

  const selectUnitsComponent =
    mode === "psth" ? (
      <SelectUnitsComponent
        unitIds={sortedUnitIds}
        selectedUnitIds={selectedUnitIds}
        setSelectedUnitIds={setSelectedUnitIds}
        sortUnitsByVariable={sortUnitsByVariable}
        sortUnitsByValues={sortUnitsByValues}
      />
    ) : (
      <></>
    );

  const prefsComponent = (
    <PrefsComponent prefs={prefs} prefsDispatch={prefsDispatch} mode={mode} />
  );

  const unitsTableWidth = 200;
  const unitsTableHeight = (height * 2) / 5;
  const prefsHeight = 150;
  const alignToSelectionComponentHeight =
    height - unitsTableHeight - prefsHeight;

  const unitWidgetHeight = Math.min(
    height,
    prefs.height === "small" ? 300 : prefs.height === "medium" ? 600 : 900,
  );

  // const initialized = useRef<boolean>(false)
  // useEffect(() => {
  //     initialized.current = false
  // }, [path, unitIds])
  // useEffect(() => {
  //     if (initialized.current) return
  //     if (unitIds.length === 0) return
  //     if (selectedUnitIds.length > 0) return
  //     setSelectedUnitIds([unitIds[0]])
  //     initialized.current = true
  // }, [unitIds, selectedUnitIds, setSelectedUnitIds])

  const bottomAreaHeight = Math.min(70, height / 3);

  const sep = <>&nbsp;&bull;&nbsp;</>;

  const trialIndices = useTrialsFilterIndices(trialsFilter, nwbFile, path);

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
    <div
      className="PSTHItemView"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          height: unitsTableHeight - 20,
          overflowY: "auto",
        }}
      >
        {unitsTable}
      </div>
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          top: unitsTableHeight,
          height: alignToSelectionComponentHeight,
          overflowY: "auto",
        }}
      >
        {alignToSelectionComponent}
      </div>
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          height: prefsHeight,
          top: unitsTableHeight + alignToSelectionComponentHeight,
          overflowY: "hidden",
        }}
      >
        {prefsComponent}
      </div>
      <div
        className="psth-item-view-right"
        style={{
          position: "absolute",
          left: unitsTableWidth,
          width: width - unitsTableWidth,
          height: height - bottomAreaHeight,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {unitIdsOrRoiIndicesToPlot.map((unitIdOrRoiIndex, i) => (
          <div
            key={unitIdOrRoiIndex}
            style={{
              position: "absolute",
              top: i * unitWidgetHeight,
              width: width - unitsTableWidth,
              height: unitWidgetHeight,
            }}
          >
            <IfHasBeenVisible
              width={width - unitsTableWidth}
              height={unitWidgetHeight}
            >
              <PSTHUnitWidget
                width={width - unitsTableWidth - 20} // leave some room for scrollbar
                height={unitWidgetHeight}
                path={path}
                spikeTrainsClient={spikeTrainsClient}
                roiClient={roiClient || undefined}
                unitId={unitIdOrRoiIndex}
                trialIndices={trialIndices}
                alignToVariables={alignToVariables}
                groupByVariable={groupByVariable}
                groupByVariableCategories={groupByVariableCategories}
                windowRange={windowRange}
                prefs={prefs}
                mode={mode}
              />
            </IfHasBeenVisible>
          </div>
        ))}
        {unitIdsOrRoiIndicesToPlot.length === 0 && (
          <div>
            Select one or more {mode === "psth" ? "units" : "ROIs"} to plot
          </div>
        )}
      </div>
      <div className="psth-bottom-area">
        <div
          style={{
            position: "absolute",
            left: unitsTableWidth,
            width: width - unitsTableWidth,
            top: height - bottomAreaHeight,
            height: bottomAreaHeight,
          }}
        >
          {windowRangeSelectionComponent}
          {sep}
          {groupBySelectionComponent}
          {sep}
          {sortUnitsBySelectionComponent}
          {sep}
          {trialsFilterComponent}

          {sortUnitsByVariable && sortUnitsByVariable[0] && sep}
          {sortUnitsByVariable &&
            sortUnitsByVariable[0] &&
            selectUnitsComponent}
        </div>
      </div>
    </div>
  );
};

const useTrialsFilterIndices = (
  trialsFilter: string | undefined,
  nwbFile: RemoteH5FileX,
  path: string,
): number[] | undefined | null => {
  const [trialIndices, setTrialIndices] = useState<number[] | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    if (!trialsFilter) {
      return;
    }
    const load = async () => {
      const grp = await nwbFile.getGroup(path);
      if (!grp) {
        console.warn(`Unable to get group: ${path}`);
        return;
      }
      if (canceled) return;
      const colnames: string[] = grp.attrs?.colnames;
      if (!colnames) {
        console.warn(`No colnames found in group: ${path}`);
        return;
      }
      const data: {
        [colname: string]: any;
      } = {};
      for (const colname of colnames) {
        if (trialsFilter.includes(colname)) {
          const dsd = await nwbFile.getDatasetData(path + "/" + colname, {});
          if (!dsd) {
            console.warn(`Unable to get data for ${path}/${colname}`);
            return;
          }
          if (canceled) return;
          data[colname] = dsd;
        }
      }
      if (Object.keys(data).length === 0) {
        console.warn(`No variables found for trials filter: ${trialsFilter}`);
        return;
      }
      const k = Object.keys(data)[0];
      const n = data[k].length;
      let script = `var inds = [];\n`;
      for (let i = 0; i < n; i++) {
        for (const colname in data) {
          script += `var ${colname} = data['${colname}'][${i}];\n`;
        }
        script += `if (${trialsFilter}) {\n`;
        script += `  inds.push(${i});\n`;
        script += `}\n`;
      }
      script += `inds;\n`;
      try {
        const inds = eval(script);
        if (canceled) return;
        setTrialIndices(inds);
      } catch (err: any) {
        console.warn(script);
        console.warn(
          `Error evaluating script for trials filter: ${err.message}`,
        );
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [trialsFilter, nwbFile, path]);
  if (!trialsFilter) return null;
  return trialIndices;
};

export const AlignToSelectionComponent: FunctionComponent<{
  alignToVariables: string[];
  setAlignToVariables: (x: string[]) => void;
  path: string;
}> = ({ alignToVariables, setAlignToVariables, path }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  const group = useGroup(nwbFile, path);
  const options = (group?.datasets || [])
    .map((ds) => ds.name)
    .filter((name) => name.endsWith("_time") || name.endsWith("_times"));

  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th></th>
          <th>Align to</th>
        </tr>
      </thead>
      <tbody>
        {options.map((option) => (
          <tr key={option}>
            <td>
              <input
                type="checkbox"
                checked={alignToVariables.includes(option)}
                onChange={() => {}}
                onClick={() => {
                  if (alignToVariables.includes(option)) {
                    setAlignToVariables(
                      alignToVariables.filter((x) => x !== option),
                    );
                  } else {
                    setAlignToVariables([...alignToVariables, option]);
                  }
                }}
              />
            </td>
            <td>{option}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

type UnitsSelectionComponentProps = {
  unitIds?: (number | string)[];
  selectedUnitIds: (number | string)[];
  setSelectedUnitIds: (x: (number | string)[]) => void;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  sortUnitsByValues: { [unitId: string | number]: any } | undefined;
};

const UnitSelectionComponent: FunctionComponent<
  UnitsSelectionComponentProps
> = ({
  unitIds,
  selectedUnitIds,
  setSelectedUnitIds,
  sortUnitsByVariable,
  sortUnitsByValues,
}) => {
  if (!unitIds) return <div>Loading unit IDs...</div>;
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={
                (unitIds || []).length > 0 &&
                selectedUnitIds.length === (unitIds || []).length
              }
              onChange={() => {}}
              onClick={() => {
                if (selectedUnitIds.length > 0) {
                  setSelectedUnitIds([]);
                } else {
                  setSelectedUnitIds(unitIds || []);
                }
              }}
            />
          </th>
          <th>Unit ID</th>
          {sortUnitsByVariable && <th>{sortUnitsByVariable[0]}</th>}
        </tr>
      </thead>
      <tbody>
        {(unitIds || []).map((unitId) => (
          <tr key={unitId}>
            <td>
              <input
                type="checkbox"
                checked={selectedUnitIds.includes(unitId)}
                onChange={() => {}}
                onClick={() => {
                  if (selectedUnitIds.includes(unitId)) {
                    setSelectedUnitIds(
                      selectedUnitIds.filter((x) => x !== unitId),
                    );
                  } else {
                    setSelectedUnitIds([...selectedUnitIds, unitId]);
                  }
                }}
              />
            </td>
            <td>{unitId}</td>
            {sortUnitsByVariable && (
              <td>{sortUnitsByValues ? sortUnitsByValues[unitId] : ""}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

type RoiSelectionComponentProps = {
  roiClient: RoiClient | null;
  selectedRoiIndices: number[];
  setSelectedRoiIndices: (x: number[]) => void;
};

const RoiSelectionComponent: FunctionComponent<RoiSelectionComponentProps> = ({
  roiClient,
  selectedRoiIndices,
  setSelectedRoiIndices,
}) => {
  const roiIndices = useMemo(() => {
    if (!roiClient) return [];
    const roiIndices = roiClient.getRoiIndices();
    return roiIndices;
  }, [roiClient]);
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={
                roiIndices.length > 0 &&
                selectedRoiIndices.length === roiIndices.length
              }
              onChange={() => {}}
              onClick={() => {
                if (selectedRoiIndices.length > 0) {
                  setSelectedRoiIndices([]);
                } else {
                  setSelectedRoiIndices(roiIndices);
                }
              }}
            />
          </th>
          <th>ROI Index</th>
        </tr>
      </thead>
      <tbody>
        {roiIndices.map((roiIndex) => (
          <tr key={roiIndex}>
            <td>
              <input
                type="checkbox"
                checked={selectedRoiIndices.includes(roiIndex)}
                onChange={() => {}}
                onClick={() => {
                  if (selectedRoiIndices.includes(roiIndex)) {
                    setSelectedRoiIndices(
                      selectedRoiIndices.filter((x) => x !== roiIndex),
                    );
                  } else {
                    setSelectedRoiIndices([...selectedRoiIndices, roiIndex]);
                  }
                }}
              />
            </td>
            <td>{roiIndex}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

type GroupBySelectionComponentProps = {
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  path: string;
  groupByVariableCategories?: string[];
  setGroupByVariableCategories?: (x: string[] | undefined) => void;
};

export const GroupBySelectionComponent: FunctionComponent<
  GroupBySelectionComponentProps
> = ({
  groupByVariable,
  setGroupByVariable,
  path,
  groupByVariableCategories,
  setGroupByVariableCategories,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  const group = useGroup(nwbFile, path);
  const options = useMemo(
    () =>
      (group?.datasets || [])
        .map((ds) => ds.name)
        .filter((name) => !name.endsWith("_time") && !name.endsWith("_times")),
    [group],
  );

  // determine which columns are categorical -- but don't let this slow down the UI
  // while it is calculating, we can use the full list of options
  const [categoricalOptions, setCategoricalOptions] = useState<
    { variableName: string; categories: string[] }[] | undefined
  >(undefined);
  useEffect(() => {
    if (!group) return;
    let canceled = false;
    const load = async () => {
      const categoricalOptions: {
        variableName: string;
        categories: string[];
      }[] = [];
      for (const option of options) {
        const ds = group.datasets.find((ds) => ds.name === option);
        if (!ds) continue;
        if (ds.shape.length !== 1) continue;
        const slice =
          ds.shape[0] < 1000 ? undefined : ([[0, 1000]] as [number, number][]); // just check the first 1000 values
        const dd = await nwbFile.getDatasetData(path + "/" + option, { slice });
        if (!dd) throw Error(`Unable to get data for ${path}/${option}`);
        if (canceled) return;
        const stringValues = [...dd].map((x) => x.toString());
        const uniqueValues: string[] = [...new Set(stringValues)];
        if (uniqueValues.length <= dd.length / 2) {
          categoricalOptions.push({
            variableName: option,
            categories: uniqueValues,
          });
        }
      }
      if (canceled) return;
      setCategoricalOptions(categoricalOptions);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [options, group, nwbFile, path]);

  const categoriesForSelectedVariable = useMemo(() => {
    if (!groupByVariable) return undefined;
    const opt = categoricalOptions?.find(
      (opt) => opt.variableName === groupByVariable,
    );
    return opt ? opt.categories : undefined;
  }, [groupByVariable, categoricalOptions]);

  return (
    <>
      Group trials by:&nbsp;
      <select
        value={groupByVariable}
        onChange={(evt) => {
          setGroupByVariable(evt.target.value);
        }}
        style={{ maxWidth: 150 }}
      >
        <option value="">(none)</option>
        {(categoricalOptions || []).map((option) => (
          <option key={option.variableName} value={option.variableName}>
            {option.variableName}
          </option>
        ))}
      </select>
      &nbsp;
      {categoriesForSelectedVariable && setGroupByVariableCategories && (
        <>
          <GroupByVariableCategoriesComponent
            groupByVariableCategories={groupByVariableCategories}
            setGroupByVariableCategories={setGroupByVariableCategories}
            options={categoriesForSelectedVariable}
          />
        </>
      )}
    </>
  );
};

type GroupByVariableCategoriesComponentProps = {
  groupByVariableCategories: string[] | undefined;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  options: string[];
};

const GroupByVariableCategoriesComponent: FunctionComponent<
  GroupByVariableCategoriesComponentProps
> = ({ groupByVariableCategories, setGroupByVariableCategories, options }) => {
  return (
    <>
      {options.map((option) => (
        <span key={option}>
          <input
            type="checkbox"
            checked={
              groupByVariableCategories?.includes(option) ||
              !groupByVariableCategories
            }
            onChange={() => {}}
            onClick={() => {
              if (groupByVariableCategories) {
                if (groupByVariableCategories.includes(option)) {
                  setGroupByVariableCategories(
                    groupByVariableCategories.filter((x) => x !== option),
                  );
                } else {
                  setGroupByVariableCategories([
                    ...(groupByVariableCategories || []),
                    option,
                  ]);
                }
              } else {
                setGroupByVariableCategories(
                  options.filter((x) => x !== option),
                );
              }
            }}
          />
          {option}
        </span>
      ))}
    </>
  );
};

type SortUnitsBySelectionComponentProps = {
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  setSortUnitsByVariable: (x: [string, "asc" | "desc"] | undefined) => void;
  unitsPath: string;
};

const SortUnitsBySelectionComponent: FunctionComponent<
  SortUnitsBySelectionComponentProps
> = ({ sortUnitsByVariable, setSortUnitsByVariable, unitsPath }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

  const group = useGroup(nwbFile, unitsPath);
  const colnames = useMemo(() => group?.attrs?.colnames || undefined, [group]);
  const variableNames: string[] | undefined = useMemo(
    () =>
      colnames
        ? colnames.filter(
            (name: string) =>
              !["spike_times", "spike_times_index", "id"].includes(name),
          )
        : [],
    [colnames],
  );

  return (
    <>
      Sort units by:&nbsp;
      <select
        value={sortUnitsByVariable ? sortUnitsByVariable[0] : ""}
        onChange={(evt) => {
          setSortUnitsByVariable([
            evt.target.value,
            sortUnitsByVariable ? sortUnitsByVariable[1] : "asc",
          ]);
        }}
        style={{ maxWidth: 150 }}
      >
        <option value="">(none)</option>
        {variableNames?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      &nbsp;
      <select
        value={sortUnitsByVariable ? sortUnitsByVariable[1] : "asc"}
        onChange={(evt) => {
          setSortUnitsByVariable([
            sortUnitsByVariable ? sortUnitsByVariable[0] : "",
            evt.target.value as "asc" | "desc",
          ]);
        }}
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </>
  );
};

export const WindowRangeSelectionComponent: FunctionComponent<{
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
}> = ({ windowRangeStr: windowRange, setWindowRangeStr: setWindowRange }) => {
  return (
    <>
      Window range (s):&nbsp;
      <input
        style={{ width: 50 }}
        type="text"
        value={windowRange.start}
        onChange={(evt) => {
          setWindowRange({ start: evt.target.value, end: windowRange.end });
        }}
      />
      &nbsp;to&nbsp;
      <input
        style={{ width: 50 }}
        type="text"
        value={windowRange.end}
        onChange={(evt) => {
          setWindowRange({ start: windowRange.start, end: evt.target.value });
        }}
      />
    </>
  );
};

type TrialsFilterComponentProps = {
  trialsFilter: string | undefined;
  setTrialsFilter: (x: string | undefined) => void;
};

const TrialsFilterComponent: FunctionComponent<TrialsFilterComponentProps> = ({
  trialsFilter,
  setTrialsFilter,
}) => {
  const { visible, handleOpen, handleClose } = useModalWindow();
  return (
    <>
      <Hyperlink onClick={handleOpen}>Trials filter:</Hyperlink>
      &nbsp;
      {abbreviated(trialsFilter, 30)}
      <ModalWindow visible={visible} onClose={handleClose}>
        <TrialsFilterEditWindow
          trialsFilter={trialsFilter}
          setTrialsFilter={setTrialsFilter}
          onClose={handleClose}
        />
      </ModalWindow>
    </>
  );
};

type SelectUnitsComponentProps = {
  unitIds: (number | string)[] | undefined;
  selectedUnitIds: (number | string)[];
  setSelectedUnitIds: (x: (number | string)[]) => void;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  sortUnitsByValues: { [unitId: string | number]: any } | undefined;
};

const SelectUnitsComponent: FunctionComponent<SelectUnitsComponentProps> = ({
  unitIds,
  setSelectedUnitIds,
  sortUnitsByVariable,
  sortUnitsByValues,
}) => {
  const { visible, handleOpen, handleClose } = useModalWindow();
  const uniqueValues = useMemo(() => {
    if (!sortUnitsByValues) return [];
    return [...new Set(Object.values(sortUnitsByValues))].sort();
  }, [sortUnitsByValues]);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const handleSelect = useCallback(() => {
    const newSelectedUnitIds = unitIds?.filter((unitId) =>
      selectedValues.includes(sortUnitsByValues?.[unitId]),
    );
    setSelectedUnitIds(newSelectedUnitIds || []);
    handleClose();
  }, [
    selectedValues,
    setSelectedUnitIds,
    unitIds,
    sortUnitsByValues,
    handleClose,
  ]);
  return (
    <>
      <Hyperlink onClick={handleOpen}>Select units</Hyperlink>
      <ModalWindow visible={visible} onClose={handleClose}>
        <div>
          <h3>
            Select units by {sortUnitsByVariable ? sortUnitsByVariable[0] : ""}
          </h3>
          <table>
            <tbody>
              {uniqueValues.map((val) => (
                <tr key={val}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedValues.includes(val)}
                      onChange={() => {}}
                      onClick={() => {
                        if (selectedValues.includes(val)) {
                          setSelectedValues(
                            selectedValues.filter((x) => x !== val),
                          );
                        } else {
                          setSelectedValues([...selectedValues, val]);
                        }
                      }}
                    />
                  </td>
                  <td>{val}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleSelect}>Select</button>
        </div>
      </ModalWindow>
    </>
  );
};

const abbreviated = (s: string | undefined, maxLen: number) => {
  if (!s) return "";
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen) + "...";
};

type TrialsFilterEditWindowProps = {
  trialsFilter: string | undefined;
  setTrialsFilter: (x: string | undefined) => void;
  onClose: () => void;
};

const TrialsFilterEditWindow: FunctionComponent<
  TrialsFilterEditWindowProps
> = ({ trialsFilter, setTrialsFilter, onClose }) => {
  const [trialsFilterText, setTrialsFilterText] = useState<string | undefined>(
    trialsFilter,
  );
  return (
    <div>
      <textarea
        style={{ width: 300, height: 100 }}
        value={trialsFilterText || ""}
        onChange={(evt) => {
          setTrialsFilterText(evt.target.value);
        }}
      />
      <br />
      <button
        onClick={() => {
          setTrialsFilter(trialsFilterText);
          onClose();
        }}
      >
        Apply
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
};

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
  const [numBinsText, setNumBinsText] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (numBins) {
      setNumBinsText(`${numBins}`);
    }
  }, [numBins]);
  useEffect(() => {
    if (!numBinsText) return;
    const val = parseInt(numBinsText);
    if (!isNaN(val)) {
      if (1 <= val && val <= 1000) {
        setNumBins(val);
      }
    }
  }, [numBinsText, setNumBins]);
  return (
    <span>
      Num. bins:&nbsp;
      <input
        style={{ width: 30 }}
        type="text"
        value={numBinsText || ""}
        onChange={(evt) => {
          setNumBinsText(evt.target.value);
        }}
      />
    </span>
  );
};

const useSortUnitsByValues = (
  nwbFile: RemoteH5FileX,
  unitsPath: string,
  sortUnitsByVariable: string,
): { [unitId: string | number]: any } | undefined => {
  const [sortUnitsByValues, setSortUnitsByValues] = useState<
    { [unitId: string | number]: any } | undefined
  >(undefined);
  useEffect(() => {
    setSortUnitsByValues(undefined);
    if (!nwbFile) return;
    if (!unitsPath) return;
    let canceled = false;
    (async () => {
      const dsId = await nwbFile.getDatasetData(unitsPath + "/id", {});
      if (canceled) return;
      const dsVar = await nwbFile.getDatasetData(
        unitsPath + "/" + sortUnitsByVariable,
        {},
      );
      if (canceled) return;
      if (!dsId || !dsVar) return;
      const x: { [unitId: string | number]: any } = {};
      for (let i = 0; i < dsId.length; i++) {
        x[dsId[i]] = dsVar[i];
      }
      setSortUnitsByValues(x);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile, unitsPath, sortUnitsByVariable]);
  return sortUnitsByValues;
};

const encodeStateToString = (state: { [key: string]: any }): string => {
  // json stringify, gzip, base64, url encode
  const json = JSON.stringify(state);
  const jsonGzip = pako.gzip(json);
  const base64 = encodeUint8ArrayToBase64(jsonGzip);
  const base64UrlEncoded = encodeURIComponent(base64);
  return base64UrlEncoded;
};

const decodeStateFromStateString = (
  stateString: string,
): { [key: string]: any } | undefined => {
  // base64, gunzip, json parse
  try {
    let base64UrlEncoded = decodeURIComponent(stateString);
    // replace space by + because the browser may have replaced + by space
    base64UrlEncoded = base64UrlEncoded.replace(/ /g, "+");
    const jsonGzip = decodeBase64ToArrayBuffer(base64UrlEncoded);
    const json = pako.ungzip(jsonGzip, { to: "string" });
    return JSON.parse(json) as { [key: string]: any };
  } catch (err: any) {
    console.error(`Error decoding state string: ${err.message}`);
    return undefined;
  }
};

const encodeUint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = "";
  const length = array.byteLength;
  for (let i = 0; i < length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
};

const decodeBase64ToArrayBuffer = (base64: string): Uint8Array => {
  const binary_string = window.atob(base64);
  const bytes = new Uint8Array(binary_string.length);
  for (let i = 0; i < binary_string.length; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
};

export default PSTHItemView;
