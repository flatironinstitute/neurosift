/* eslint-disable @typescript-eslint/no-explicit-any */
import pako from "pako";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import AlignToSelectionComponent from "./components/AlignToSelection";
import GroupBySelectionComponent from "./components/GroupBySelection";
import PrefsComponent from "./components/Preferences";
import RoiSelectionComponent from "./components/RoiSelection";
import SortUnitsBySelectionComponent from "./components/SortUnitsBy";
import UnitSelectionComponent from "./components/UnitSelection";
import WindowRangeComponent from "./components/WindowRange";
import {
  UnitSelectionContext,
  defaultUnitSelection,
  sortIds,
  unitSelectionReducer,
} from "./context-unit-selection";
import { useSelectedUnitIds } from "./context-unit-selection/UnitSelectionContext";
import { DirectSpikeTrainsClient } from "./DirectSpikeTrainsClient";
import { useSortUnitsByValues } from "./hooks/useSortUnitsBy";
import { useTrialsFilterIndices } from "./hooks/useTrialsFilter";
import IfHasBeenVisible from "./IfHasBeenVisible";
import PSTHUnitWidget from "./PSTHUnitWidget";
import { useRoiClient } from "./ROIClient";
import {
  defaultPSTHPrefs,
  PSTHPrefs,
  PSTHPrefsAction,
  PSTHTrialAlignedSeriesMode,
} from "./types";

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

  const sortUnitsByValues: { [unitId: string | number]: any } | undefined =
    useSortUnitsByValues(
      nwbUrl,
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
        spikeTrainsClient={spikeTrainsClient}
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
      nwbUrl={nwbUrl}
      path={path}
    />
  );

  const windowRangeSelectionComponent = (
    <WindowRangeComponent
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
      nwbUrl={nwbUrl}
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
        nwbUrl={nwbUrl}
        unitsPath={unitsPath}
      />
    ) : (
      <></>
    );

  // const trialsFilterComponent = (
  //   <TrialsFilterComponent
  //     trialsFilter={trialsFilter}
  //     setTrialsFilter={setTrialsFilter}
  //   />
  // );

  // const selectUnitsComponent =
  //   mode === "psth" ? (
  //     <SelectUnitsComponent
  //       unitIds={sortedUnitIds}
  //       selectedUnitIds={selectedUnitIds}
  //       setSelectedUnitIds={setSelectedUnitIds}
  //       sortUnitsByVariable={sortUnitsByVariable}
  //       sortUnitsByValues={sortUnitsByValues}
  //     />
  //   ) : (
  //     <></>
  //   );

  const prefsComponent = (
    <PrefsComponent prefs={prefs} prefsDispatch={prefsDispatch} mode={mode} />
  );

  const unitsTableWidth = 250;
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

  const trialIndices = useTrialsFilterIndices(trialsFilter, nwbUrl, path);

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
                nwbUrl={nwbUrl}
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
          {/* {sep}
          {trialsFilterComponent} */}

          {/* {sortUnitsByVariable && sortUnitsByVariable[0] && sep}
          {sortUnitsByVariable &&
            sortUnitsByVariable[0] &&
            selectUnitsComponent} */}
        </div>
      </div>
    </div>
  );
};

// type TrialsFilterComponentProps = {
//   trialsFilter: string | undefined;
//   setTrialsFilter: (x: string | undefined) => void;
// };

// const TrialsFilterComponent: FunctionComponent<TrialsFilterComponentProps> = ({
//   trialsFilter,
//   setTrialsFilter,
// }) => {
//   const { visible, handleOpen, handleClose } = useModalWindow();
//   return (
//     <>
//       <Hyperlink onClick={handleOpen}>Trials filter:</Hyperlink>
//       &nbsp;
//       {abbreviated(trialsFilter, 30)}
//       <ModalWindow visible={visible} onClose={handleClose}>
//         <TrialsFilterEditWindow
//           trialsFilter={trialsFilter}
//           setTrialsFilter={setTrialsFilter}
//           onClose={handleClose}
//         />
//       </ModalWindow>
//     </>
//   );
// };

// type SelectUnitsComponentProps = {
//   unitIds: (number | string)[] | undefined;
//   selectedUnitIds: (number | string)[];
//   setSelectedUnitIds: (x: (number | string)[]) => void;
//   sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
//   sortUnitsByValues: { [unitId: string | number]: any } | undefined;
// };

// const SelectUnitsComponent: FunctionComponent<SelectUnitsComponentProps> = ({
//   unitIds,
//   setSelectedUnitIds,
//   sortUnitsByVariable,
//   sortUnitsByValues,
// }) => {
//   const { visible, handleOpen, handleClose } = useModalWindow();
//   const uniqueValues = useMemo(() => {
//     if (!sortUnitsByValues) return [];
//     return [...new Set(Object.values(sortUnitsByValues))].sort();
//   }, [sortUnitsByValues]);
//   const [selectedValues, setSelectedValues] = useState<string[]>([]);
//   const handleSelect = useCallback(() => {
//     const newSelectedUnitIds = unitIds?.filter((unitId) =>
//       selectedValues.includes(sortUnitsByValues?.[unitId]),
//     );
//     setSelectedUnitIds(newSelectedUnitIds || []);
//     handleClose();
//   }, [
//     selectedValues,
//     setSelectedUnitIds,
//     unitIds,
//     sortUnitsByValues,
//     handleClose,
//   ]);
//   return (
//     <>
//       <Hyperlink onClick={handleOpen}>Select units</Hyperlink>
//       <ModalWindow visible={visible} onClose={handleClose}>
//         <div>
//           <h3>
//             Select units by {sortUnitsByVariable ? sortUnitsByVariable[0] : ""}
//           </h3>
//           <table>
//             <tbody>
//               {uniqueValues.map((val) => (
//                 <tr key={val}>
//                   <td>
//                     <input
//                       type="checkbox"
//                       checked={selectedValues.includes(val)}
//                       onChange={() => {}}
//                       onClick={() => {
//                         if (selectedValues.includes(val)) {
//                           setSelectedValues(
//                             selectedValues.filter((x) => x !== val),
//                           );
//                         } else {
//                           setSelectedValues([...selectedValues, val]);
//                         }
//                       }}
//                     />
//                   </td>
//                   <td>{val}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <button onClick={handleSelect}>Select</button>
//         </div>
//       </ModalWindow>
//     </>
//   );
// };

// const abbreviated = (s: string | undefined, maxLen: number) => {
//   if (!s) return "";
//   if (s.length <= maxLen) return s;
//   return s.slice(0, maxLen) + "...";
// };

// type TrialsFilterEditWindowProps = {
//   trialsFilter: string | undefined;
//   setTrialsFilter: (x: string | undefined) => void;
//   onClose: () => void;
// };

// const TrialsFilterEditWindow: FunctionComponent<
//   TrialsFilterEditWindowProps
// > = ({ trialsFilter, setTrialsFilter, onClose }) => {
//   const [trialsFilterText, setTrialsFilterText] = useState<string | undefined>(
//     trialsFilter,
//   );
//   return (
//     <div>
//       <textarea
//         style={{ width: 300, height: 100 }}
//         value={trialsFilterText || ""}
//         onChange={(evt) => {
//           setTrialsFilterText(evt.target.value);
//         }}
//       />
//       <br />
//       <button
//         onClick={() => {
//           setTrialsFilter(trialsFilterText);
//           onClose();
//         }}
//       >
//         Apply
//       </button>
//       <button onClick={onClose}>Cancel</button>
//     </div>
//   );
// };

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
