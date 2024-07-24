/* eslint-disable @typescript-eslint/no-explicit-any */
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { RemoteH5FileX } from "@remote-h5-file/index";
import { Button } from "@mui/material";
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
} from "../../../../package/context-unit-selection";
import { useSelectedUnitIds } from "../../../../package/context-unit-selection/UnitSelectionContext";
import { useNwbFile } from "../../NwbFileContext";
import { useGroup } from "../../NwbMainView/NwbMainView";
import { DirectSpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView";
import IfHasBeenVisible from "./IfHasBeenVisible";
import PSTHUnitWidget from "./PSTHUnitWidget";

type Props = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
  initialStateString?: string;
  setStateString?: (x: string) => void;
};

const PSTHItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
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

const PSTHItemViewChild: FunctionComponent<Props> = ({
  width,
  height,
  path,
  additionalPaths,
  initialStateString,
  setStateString,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");

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
    const load = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbFile, unitsPath);
      if (canceled) return;
      setSpikeTrainsClient(client);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile, unitsPath]);

  const unitIds = useMemo(() => {
    if (!spikeTrainsClient) return [];
    return spikeTrainsClient.unitIds;
  }, [spikeTrainsClient]);

  const [alignToVariables, setAlignToVariables] = useState<string[]>([
    "start_time",
  ]);
  const [groupByVariable, setGroupByVariable] = useState<string>("");
  const [groupByVariableCategories, setGroupByVariableCategories] = useState<
    string[] | undefined
  >([]);
  useEffect(() => {
    setGroupByVariableCategories(undefined);
  }, [groupByVariable]);
  const [sortUnitsByVariable, setSortUnitsByVariable] = useState<
    [string, "asc" | "desc"] | undefined
  >(undefined);

  const sortUnitsByValues: { [unitId: string | number]: any } | undefined =
    useSortUnitsByValues(
      nwbFile,
      unitsPath,
      sortUnitsByVariable ? sortUnitsByVariable[0] : "",
    );

  const sortUnitsByDirection = sortUnitsByVariable
    ? sortUnitsByVariable[1]
    : "asc";
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
  }>({ start: "-0.5", end: "1" });
  const windowRange = useMemo(() => {
    const t1 = parseFloat(windowRangeStr.start);
    const t2 = parseFloat(windowRangeStr.end);
    if (isNaN(t1) || isNaN(t2)) return { start: 0, end: 1 };
    if (t1 >= t2) return { start: 0, end: 1 };
    if (t2 - t1 > 20) return { start: 0, end: 1 };
    return {
      start: t1,
      end: t2,
    };
  }, [windowRangeStr]);

  const {
    handleOpen: openAdvancedOpts,
    handleClose: closeAdvancedOpts,
    visible: advancedOptsVisible,
  } = useModalWindow();

  const [prefs, prefsDispatch] = useReducer(psthPrefsReducer, defaultPSTHPrefs);

  useEffect(() => {
    if (!initialStateString) return;
    const a = decodeStateFromStateString(initialStateString);
    if (!a) return;
    if (a.complementOfSelectedUnitIds) {
      setSelectedUnitIds(
        sortedUnitIds.filter(
          (unitId) => !a.complementOfSelectedUnitIds.includes(unitId),
        ),
      );
    } else if (a.selectedUnitIds) {
      const sortedSelectedUnitIds = [...a.selectedUnitIds].sort();
      setSelectedUnitIds(sortedSelectedUnitIds);
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
    sortedUnitIds,
    setSelectedUnitIds,
    setAlignToVariables,
    setGroupByVariable,
    setGroupByVariableCategories,
    setSortUnitsByVariable,
    setWindowRangeStr,
    prefsDispatch,
  ]);

  useEffect(() => {
    if (!setStateString) return;
    const state0: { [key: string]: any } = {
      selectedUnitIds,
      alignToVariables,
      groupByVariable,
      groupByVariableCategories,
      sortUnitsByVariable,
      windowRangeStr,
      prefs,
    };
    if (selectedUnitIds.length > sortedUnitIds.length / 2) {
      state0.complementOfSelectedUnitIds = sortedUnitIds.filter(
        (unitId) => !selectedUnitIds.includes(unitId),
      );
      delete state0.selectedUnitIds;
    }
    setStateString(encodeStateToString(state0));
  }, [
    selectedUnitIds,
    sortedUnitIds,
    setStateString,
    alignToVariables,
    groupByVariable,
    groupByVariableCategories,
    sortUnitsByVariable,
    windowRangeStr,
    prefs,
  ]);

  const unitsTable = (
    <UnitSelectionComponent
      unitIds={sortedUnitIds}
      selectedUnitIds={selectedUnitIds}
      setSelectedUnitIds={setSelectedUnitIds}
      sortUnitsByVariable={sortUnitsByVariable}
      sortUnitsByValues={sortUnitsByValues}
    />
  );

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
      setGroupByVariable={setGroupByVariable}
      path={path}
      groupByVariableCategories={groupByVariableCategories}
      setGroupByVariableCategories={setGroupByVariableCategories}
    />
  );

  const prefsComponent = (
    <PrefsComponent
      prefs={prefs}
      prefsDispatch={prefsDispatch}
      advanced={false}
      onOpenAdvanced={openAdvancedOpts}
    />
  );

  const unitsTableWidth = 200;
  const unitsTableHeight = (height * 2) / 5;
  const groupByHeight = 50;
  const windowRangeHeight = 70;
  const prefsHeight = 150;
  const alignToSelectionComponentHeight =
    height - unitsTableHeight - groupByHeight - windowRangeHeight - prefsHeight;

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
          top: unitsTableHeight + alignToSelectionComponentHeight,
          height: windowRangeHeight,
          overflowY: "hidden",
        }}
      >
        <hr />
        {windowRangeSelectionComponent}
      </div>
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          height: groupByHeight,
          top:
            unitsTableHeight +
            alignToSelectionComponentHeight +
            windowRangeHeight,
          overflowY: "hidden",
        }}
      >
        {groupBySelectionComponent}
      </div>
      <div
        style={{
          position: "absolute",
          width: unitsTableWidth,
          height: prefsHeight,
          top:
            unitsTableHeight +
            alignToSelectionComponentHeight +
            windowRangeHeight +
            groupByHeight,
          overflowY: "hidden",
        }}
      >
        {prefsComponent}
        <hr />
      </div>
      <div
        className="psth-item-view-right"
        style={{
          position: "absolute",
          left: unitsTableWidth,
          width: width - unitsTableWidth,
          height,
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {spikeTrainsClient &&
          sortedSelectedUnitIds.map((unitId, i) => (
            <div
              key={unitId}
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
                  unitId={unitId}
                  alignToVariables={alignToVariables}
                  groupByVariable={groupByVariable}
                  groupByVariableCategories={groupByVariableCategories}
                  windowRange={windowRange}
                  prefs={prefs}
                />
              </IfHasBeenVisible>
            </div>
          ))}
        {selectedUnitIds.length === 0 && <div>Select one or more units</div>}
      </div>
      <ModalWindow visible={advancedOptsVisible} onClose={closeAdvancedOpts}>
        <div>
          <WindowRangeSelectionComponent
            windowRangeStr={windowRangeStr}
            setWindowRangeStr={setWindowRangeStr}
            advanced={true}
          />
          <hr />
          <GroupBySelectionComponent
            groupByVariable={groupByVariable}
            setGroupByVariable={setGroupByVariable}
            path={path}
            advanced={true}
            groupByVariableCategories={groupByVariableCategories}
            setGroupByVariableCategories={setGroupByVariableCategories}
          />
          <hr />
          <SortUnitsBySelectionComponent
            sortUnitsByVariable={sortUnitsByVariable}
            setSortUnitsByVariable={setSortUnitsByVariable}
            unitsPath={unitsPath}
          />
          <hr />
          <PrefsComponent
            prefs={prefs}
            prefsDispatch={prefsDispatch}
            advanced={true}
            onOpenAdvanced={undefined}
          />
          <div>
            <Button onClick={closeAdvancedOpts}>Close</Button>
          </div>
        </div>
      </ModalWindow>
    </div>
  );
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
  unitIds: (number | string)[];
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
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={
                unitIds.length > 0 && selectedUnitIds.length === unitIds.length
              }
              onChange={() => {}}
              onClick={() => {
                if (selectedUnitIds.length > 0) {
                  setSelectedUnitIds([]);
                } else {
                  setSelectedUnitIds(unitIds);
                }
              }}
            />
          </th>
          <th>Unit ID</th>
          {sortUnitsByVariable && <th>{sortUnitsByVariable[0]}</th>}
        </tr>
      </thead>
      <tbody>
        {unitIds.map((unitId) => (
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

type GroupBySelectionComponentProps = {
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  path: string;
  advanced?: boolean;
  groupByVariableCategories?: string[];
  setGroupByVariableCategories?: (x: string[] | undefined) => void;
};

export const GroupBySelectionComponent: FunctionComponent<
  GroupBySelectionComponentProps
> = ({
  groupByVariable,
  setGroupByVariable,
  path,
  advanced,
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
    <div>
      Group by:
      <br />
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
      {advanced &&
        categoriesForSelectedVariable &&
        setGroupByVariableCategories && (
          <div>
            <GroupByVariableCategoriesComponent
              groupByVariableCategories={groupByVariableCategories}
              setGroupByVariableCategories={setGroupByVariableCategories}
              options={categoriesForSelectedVariable}
            />
          </div>
        )}
    </div>
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
    <div>
      <table>
        <tbody>
          {options.map((option) => (
            <tr key={option}>
              <td>
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
              </td>
              <td>{option}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div>
      Sort units by:
      <br />
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
    </div>
  );
};

export const WindowRangeSelectionComponent: FunctionComponent<{
  windowRangeStr: { start: string; end: string };
  setWindowRangeStr: (x: { start: string; end: string }) => void;
  advanced?: boolean;
}> = ({ windowRangeStr: windowRange, setWindowRangeStr: setWindowRange }) => {
  return (
    <div>
      Window range (sec):
      <br />
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
    </div>
  );
};

type PrefsComponentProps = {
  prefs: PSTHPrefs;
  prefsDispatch: (x: PSTHPrefsAction) => void;
  advanced: boolean;
  onOpenAdvanced: (() => void) | undefined;
};

const PrefsComponent: FunctionComponent<PrefsComponentProps> = ({
  prefs,
  prefsDispatch,
  advanced,
  onOpenAdvanced,
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
      <input
        type="checkbox"
        checked={prefs.showHist}
        onChange={() => {}}
        onClick={handleToggleShowHist}
      />{" "}
      Show histogram
      <br />
      <NumBinsComponent numBins={prefs.numBins} setNumBins={handleSetNumBins} />
      <br />
      <input
        type="checkbox"
        checked={prefs.smoothedHist}
        onChange={() => {}}
        onClick={handleToggleSmoothedHist}
      />{" "}
      Smoothed
      <br />
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
      <hr />
      {!advanced && onOpenAdvanced && (
        <button onClick={onOpenAdvanced}>Advanced</button>
      )}
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
