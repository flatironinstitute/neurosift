/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FunctionComponent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useNwbFile } from "../../NwbFileContext";
import IfHasBeenVisible from "../PSTH/IfHasBeenVisible";
import {
  AlignToSelectionComponent,
  WindowRangeSelectionComponent,
} from "../PSTH/PSTHItemView";
import { RemoteH5FileX } from "@remote-h5-file/index";
import RoiWidget from "./RoiWidget";

// testing: http://localhost:4200/neurosift/?p=/nwb&dandisetId=000728&dandisetVersion=draft&url=https://api.dandiarchive.org/api/assets/de11c023-5bb2-4055-b265-d2c73dfe13a9/download/&url=https://api.dandiarchive.org/api/assets/5fe35951-5480-4fd0-94f8-7b139c994c9e/download/&tab=view:TimeAlignedSeries|/acquisition/drifting_gratings^/processing/ophys/Fluorescence/RoiResponseSeriesCorrected

type TimeAlignedSeriesItemViewProps = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
};

const TimeAlignedSeriesItemView: FunctionComponent<
  TimeAlignedSeriesItemViewProps
> = ({ width, height, path, additionalPaths }) => {
  const [roiSelection, roiSelectionDispatch] = useReducer(
    roiSelectionReducer,
    defaultRoiSelection,
  );
  return (
    <RoiSelectionContext.Provider
      value={{ roiSelection, roiSelectionDispatch }}
    >
      <TimeAlignedSeriesItemViewChild
        width={width}
        height={height}
        path={path}
        additionalPaths={additionalPaths}
      />
    </RoiSelectionContext.Provider>
  );
};

export type TASPrefs = {
  height: "small" | "medium" | "large";
  maxNumRois: number;
};

type TASPrefsAction = {
  type: "SET_PREF";
  key: keyof TASPrefs;
  value: any;
};

const tasPrefsReducer = (state: TASPrefs, action: TASPrefsAction): TASPrefs => {
  switch (action.type) {
    case "SET_PREF":
      return { ...state, [action.key]: action.value };
    default:
      return state;
  }
};

export const defaultTasPrefs: TASPrefs = {
  height: "medium",
  maxNumRois: 50,
};

type TimeAlignedSeriesItemViewChildProps = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
};

export class RoiClient {
  status: "pending" | "loading" | "loaded" | "error" = "pending";
  array: number[][] | undefined;
  canceler: { onCancel: (() => void)[] } = { onCancel: [] };
  onLoadedCallbacks: (() => void)[] = [];
  constructor(
    private nwbFile: RemoteH5FileX,
    private roiIndices: number[],
    private roiPath: string,
    shape: number[],
    private roiTimestamps0: number[],
  ) {
    (async () => {
      this.status = "loading";
      const a = await nwbFile.getDatasetData(roiPath + "/data", {
        canceler: this.canceler /*, slice: [[0, 1000]]*/,
      });
      if (!a) throw Error("No data in RoiClient");
      this.array = transpose2DArray(create2DArray(a as any as number[], shape));
      this.status = "loaded";
      this.onLoadedCallbacks.forEach((cb) => cb());
    })();
  }
  static async create(nwbFile: RemoteH5FileX, additionalPaths?: string[]) {
    const roiPath =
      additionalPaths && additionalPaths.length === 1
        ? additionalPaths[0]
        : undefined;
    if (!roiPath) throw Error("Unexpected: no roiPath");
    const ds = await nwbFile.getDataset(roiPath + "/data");
    if (!ds) throw Error("Unable to get dataset: " + roiPath);
    const numRois = ds.shape[1];
    const roiIndices = Array.from({ length: numRois }, (_, i) => i);
    const a = await nwbFile.getDatasetData(roiPath + "/timestamps", {});
    if (!a) throw Error("No timestamps in RoiClient");
    const timestamps = a as any as number[];
    const client = new RoiClient(
      nwbFile,
      roiIndices,
      roiPath,
      ds.shape,
      timestamps,
    );
    return client;
  }
  destroy() {
    this.canceler.onCancel.forEach((cb) => cb());
  }
  get roiData(): number[][] | undefined {
    if (this.status === "loaded") return this.array;
    return undefined;
  }
  get roiTimestamps(): number[] {
    return this.roiTimestamps0;
  }
  getRoiIndices() {
    return this.roiIndices;
  }
  async waitForLoaded() {
    if (this.status === "loaded") return;
    return new Promise<void>((resolve) => {
      this.onLoadedCallbacks.push(resolve);
    });
  }
}

const useRoiClient = (
  nwbFile: RemoteH5FileX,
  path: string,
  additionalPaths?: string[],
) => {
  const [roiClient, setRoiClient] = useState<RoiClient | null>(null);
  useEffect(() => {
    let canceled = false;
    let client: RoiClient | null = null;
    (async () => {
      client = await RoiClient.create(nwbFile, additionalPaths);
      if (canceled) return;
      setRoiClient(client);
    })();
    return () => {
      if (client) {
        client.destroy();
      }
      canceled = true;
    };
  }, [nwbFile, path, additionalPaths]);
  return roiClient;
};

const TimeAlignedSeriesItemViewChild: FunctionComponent<
  TimeAlignedSeriesItemViewChildProps
> = ({ width, height, path, additionalPaths }) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: no nwbFile");
  const { selectedRoiIndices, setSelectedRoiIndices } = useRoiSelection();
  const roiClient = useRoiClient(nwbFile, path, additionalPaths);

  const roiIndices = useMemo(() => {
    return roiClient ? roiClient.getRoiIndices() : [];
  }, [roiClient]);

  const [alignToVariables, setAlignToVariables] = useState<string[]>([
    "start_time",
  ]);
  const [windowRangeStr, setWindowRangeStr] = useState<{
    start: string;
    end: string;
  }>({ start: "-0.5", end: "5" });
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

  const [prefs, prefsDispatch] = useReducer(tasPrefsReducer, defaultTasPrefs);

  const roisTable = (
    <RoiSelectionComponent
      roiIndices={roiIndices}
      selectedRoiIndices={selectedRoiIndices}
      setSelectedRoiIndices={setSelectedRoiIndices}
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

  const prefsComponent = (
    <PrefsComponent prefs={prefs} prefsDispatch={prefsDispatch} />
  );

  const roisTableWidth = 200;
  const roisTableHeight = (height * 2) / 5;
  const windowRangeHeight = 70;
  const prefsHeight = 150;
  const alignToSelectionComponentHeight =
    height - roisTableHeight - windowRangeHeight - prefsHeight;

  const roiWidgetHeight = Math.min(
    height,
    prefs.height === "small" ? 150 : prefs.height === "medium" ? 300 : 450,
  );

  return (
    <div style={{ position: "absolute", width, height }}>
      <div
        style={{
          position: "absolute",
          width: roisTableWidth,
          height: roisTableHeight - 20,
          overflowY: "auto",
        }}
      >
        {roisTable}
      </div>
      <div
        style={{
          position: "absolute",
          width: roisTableWidth,
          top: roisTableHeight,
          height: alignToSelectionComponentHeight,
          overflowY: "auto",
        }}
      >
        {alignToSelectionComponent}
      </div>
      <div
        style={{
          position: "absolute",
          width: roisTableWidth,
          top: roisTableHeight + alignToSelectionComponentHeight,
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
          width: roisTableWidth,
          height: prefsHeight,
          top:
            roisTableHeight +
            alignToSelectionComponentHeight +
            windowRangeHeight,
          overflowY: "hidden",
        }}
      >
        {prefsComponent}
        <hr />
      </div>
      <div
        style={{
          position: "absolute",
          left: roisTableWidth,
          width: width - roisTableWidth,
          height,
          overflowY: "auto",
        }}
      >
        {roiClient &&
          selectedRoiIndices.map((roiIndex, i) => (
            <div
              key={roiIndex}
              style={{
                position: "absolute",
                top: i * roiWidgetHeight,
                width: width - roisTableWidth,
                height: roiWidgetHeight,
              }}
            >
              <IfHasBeenVisible
                width={width - roisTableWidth}
                height={roiWidgetHeight}
              >
                <RoiWidget
                  width={width - roisTableWidth}
                  height={roiWidgetHeight}
                  nwbFile={nwbFile}
                  timeIntervalsPath={path}
                  roiClient={roiClient}
                  roiIndex={roiIndex}
                  alignToVariables={alignToVariables}
                  windowRange={windowRange}
                  prefs={prefs}
                />
              </IfHasBeenVisible>
            </div>
          ))}
        {selectedRoiIndices.length === 0 && <div>Select one or more ROIs</div>}
      </div>
    </div>
  );
};

type RoiSelectionState = {
  selectedRoiIndices: number[];
};

type RoiSelectionAction = {
  type: "setSelectedRoiIndices";
  selectedRoiIndices: number[];
};

const defaultRoiSelection: RoiSelectionState = {
  selectedRoiIndices: [],
};

const roiSelectionReducer = (
  state: RoiSelectionState,
  action: RoiSelectionAction,
): RoiSelectionState => {
  switch (action.type) {
    case "setSelectedRoiIndices":
      return { ...state, selectedRoiIndices: action.selectedRoiIndices };
    default:
      return state;
  }
};

const RoiSelectionContext = createContext<{
  roiSelection: RoiSelectionState;
  roiSelectionDispatch: React.Dispatch<RoiSelectionAction>;
}>({
  roiSelection: defaultRoiSelection,
  roiSelectionDispatch: () => {},
});

const useRoiSelection = () => {
  const { roiSelection, roiSelectionDispatch } =
    useContext(RoiSelectionContext);
  const selectedRoiIndices = roiSelection.selectedRoiIndices;
  const setSelectedRoiIndices = useCallback(
    (selectedRoiIndices: number[]) => {
      roiSelectionDispatch({
        type: "setSelectedRoiIndices",
        selectedRoiIndices,
      });
    },
    [roiSelectionDispatch],
  );
  return {
    selectedRoiIndices,
    setSelectedRoiIndices,
  };
};

type PrefsComponentProps = {
  prefs: TASPrefs;
  prefsDispatch: (x: TASPrefsAction) => void;
};

const PrefsComponent: FunctionComponent<PrefsComponentProps> = ({
  prefs,
  prefsDispatch,
}) => {
  return (
    <div>
      <div>
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
      <div>&nbsp;</div>
      <IntEdit
        value={prefs.maxNumRois}
        setValue={(x) => {
          prefsDispatch({ type: "SET_PREF", key: "maxNumRois", value: x });
        }}
        label="Max num"
      />
    </div>
  );
};

const IntEdit: FunctionComponent<{
  value: number;
  setValue: (x: number) => void;
  label: string;
}> = ({ value, setValue, label }) => {
  return (
    <div>
      {label}:&nbsp;
      <input
        type="number"
        value={value}
        onChange={(evt) => {
          setValue(parseInt(evt.target.value));
        }}
        style={{ maxWidth: 50 }}
      />
    </div>
  );
};

const RoiSelectionComponent: FunctionComponent<{
  roiIndices: number[];
  selectedRoiIndices: number[];
  setSelectedRoiIndices: (x: number[]) => void;
}> = ({ roiIndices, selectedRoiIndices, setSelectedRoiIndices }) => {
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

const create2DArray = (array: number[], shape: number[]) => {
  const result: number[][] = [];
  let i = 0;
  for (let j = 0; j < shape[0]; j++) {
    result.push(array.slice(i, i + shape[1]));
    i += shape[1];
  }
  return result;
};

const transpose2DArray = (array: number[][]) => {
  const result: number[][] = [];
  for (let i = 0; i < array[0].length; i++) {
    result.push(array.map((row) => row[i]));
  }
  return result;
};

export default TimeAlignedSeriesItemView;
