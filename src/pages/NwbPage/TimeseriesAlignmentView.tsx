/* eslint-disable @typescript-eslint/no-explicit-any */
import { SmallIconButton } from "@fi-sci/misc";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { FaEye } from "react-icons/fa";
import { getHdf5DatasetData, getHdf5Group } from "./hdf5Interface";
import {
  useNwbFileSpecifications,
  NwbFileSpecifications,
} from "./SpecificationsView/SetupNwbFileSpecificationsProvider";

type Props = {
  nwbUrl: string;
  width: number;
  isExpanded?: boolean;
  onOpenTimeseriesItem: (path: string) => void;
};

type TAItem = {
  path: string;
  neurodataType: string;
  itemType: "timeseries" | "timeintervals" | "events";
  startTime: number;
  endTime: number;
};

type TimeseriesAlignmentState = {
  timeseries: TAItem[];
};

type TimeseriesAlignmentAction =
  | { type: "addItem"; item: TAItem }
  | { type: "reset" };

const timeseriesAlignmentReducer = (
  state: TimeseriesAlignmentState,
  action: TimeseriesAlignmentAction,
) => {
  switch (action.type) {
    case "addItem":
      return {
        ...state,
        timeseries: [...state.timeseries, action.item],
      };
    case "reset":
      return { timeseries: [] };
    default:
      return state;
  }
};

// Top-level NWB groups (children of /) that can contain timeseries data.
// Other root children like /general, /specifications, /file_create_date are skipped.
const timeseriesRootPaths = new Set([
  "acquisition",
  "processing",
  "analysis",
  "stimulus",
  "intervals",
  "units",
]);

// Build sets of relevant data types and container types from NWB specs.
// relevantTypes: types that descend from TimeSeries, TimeIntervals, or Events
// containerTypes: types that might contain relevant types (NWBDataInterface
//   subtypes, ProcessingModule) but are not themselves data types
const buildTypeSets = (
  specs: NwbFileSpecifications,
): { relevantTypes: Set<string>; containerTypes: Set<string> } => {
  const parentOf: Record<string, string> = {};
  for (const g of specs.allGroups) {
    if (g.neurodata_type_inc) {
      parentOf[g.neurodata_type_def] = g.neurodata_type_inc;
    }
  }
  const descendsFrom = (type: string, ancestor: string): boolean => {
    let current: string | undefined = type;
    while (current) {
      if (current === ancestor) return true;
      current = parentOf[current];
    }
    return false;
  };
  const relevantTypes = new Set<string>();
  const containerTypes = new Set<string>();
  for (const g of specs.allGroups) {
    const def = g.neurodata_type_def;
    if (
      descendsFrom(def, "TimeSeries") ||
      descendsFrom(def, "TimeIntervals") ||
      descendsFrom(def, "Events")
    ) {
      relevantTypes.add(def);
    } else if (
      descendsFrom(def, "NWBDataInterface") ||
      descendsFrom(def, "ProcessingModule")
    ) {
      containerTypes.add(def);
    }
  }
  return { relevantTypes, containerTypes };
};

const TimeseriesAlignmentView: FunctionComponent<Props> = ({
  nwbUrl,
  width,
  isExpanded,
  onOpenTimeseriesItem,
}) => {
  const specifications = useNwbFileSpecifications();
  const typeSets = useMemo(
    () => (specifications ? buildTypeSets(specifications) : undefined),
    [specifications],
  );
  const [timeseriesAlignment, timeseriesAlignmentDispatch] = useReducer(
    timeseriesAlignmentReducer,
    { timeseries: [] },
  );
  const [loadingMessage, setLoadingMessage] = useState("");
  // Paths the user has toggled off. Hidden items are dimmed, their bar is not
  // drawn, and they are excluded from the overall start/end time range so the
  // remaining items rescale to fill the width.
  const [hiddenPaths, setHiddenPaths] = useState<Set<string>>(new Set());
  const toggleVisible = useCallback((path: string) => {
    setHiddenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    if (!typeSets) return;
    timeseriesAlignmentDispatch({ type: "reset" });
    setHiddenPaths(new Set());
    setLoadingMessage("Loading...");
    let canceled = false;
    const handleGroup = async (path: string) => {
      let gr;
      try {
        gr = await getHdf5Group(nwbUrl, path);
      } catch (err) {
        console.warn("Problem loading group", path, err);
        return;
      }
      if (canceled) return;
      if (!gr) return;
      try {
        const nt = gr.attrs?.["neurodata_type"];
        const isTimeseries =
          nt &&
          !gr.subgroups?.length &&
          gr.datasets?.find((ds: any) => ds.name === "data") &&
          (gr.datasets.find((ds: any) => ds.name === "timestamps") ||
            gr.datasets.find((ds: any) => ds.name === "starting_time"));
        if (isTimeseries) {
          const timestampsSubdataset = gr.datasets.find(
            (ds: any) => ds.name === "timestamps",
          );
          const startingTimeSubdataset = gr.datasets.find(
            (ds: any) => ds.name === "starting_time",
          );
          const dataSubdataset = gr.datasets.find(
            (ds: any) => ds.name === "data",
          );
          if (timestampsSubdataset) {
            const N = timestampsSubdataset.shape?.[0];
            if (N && N > 0) {
              const v1 = await getHdf5DatasetData(
                nwbUrl,
                timestampsSubdataset.path,
                { slice: [[0, 1]] },
              );
              if (canceled) return;
              if (!v1) return;
              const v2 = await getHdf5DatasetData(
                nwbUrl,
                timestampsSubdataset.path,
                { slice: [[N - 1, N]] },
              );
              if (canceled) return;
              if (!v2) return;
              timeseriesAlignmentDispatch({
                type: "addItem",
                item: {
                  path: gr.path,
                  neurodataType: nt,
                  itemType: "timeseries",
                  startTime: v1[0],
                  endTime: v2[0],
                },
              });
            }
          } else if (startingTimeSubdataset && dataSubdataset) {
            const v = await getHdf5DatasetData(
              nwbUrl,
              startingTimeSubdataset.path,
              {},
            );
            if (canceled) return;
            const startTime = v as any as number;
            const rate = startingTimeSubdataset.attrs?.["rate"];
            if (rate && rate > 0) {
              const endTime = startTime + (dataSubdataset.shape[0] - 1) / rate;
              timeseriesAlignmentDispatch({
                type: "addItem",
                item: {
                  path: gr.path,
                  neurodataType: nt,
                  itemType: "timeseries",
                  startTime,
                  endTime,
                },
              });
            }
          }
        } else if (nt === "TimeIntervals") {
          const startTimeDataset = gr.datasets?.find(
            (ds: any) => ds.name === "start_time",
          );
          const stopTimeDataset = gr.datasets?.find(
            (ds: any) => ds.name === "stop_time",
          );
          if (startTimeDataset && stopTimeDataset) {
            const N = startTimeDataset.shape?.[0];
            if (N && N > 0) {
              const firstStart = await getHdf5DatasetData(
                nwbUrl,
                startTimeDataset.path,
                { slice: [[0, 1]] },
              );
              if (canceled) return;
              const lastStop = await getHdf5DatasetData(
                nwbUrl,
                stopTimeDataset.path,
                { slice: [[N - 1, N]] },
              );
              if (canceled) return;
              if (firstStart && lastStop) {
                const startTime = firstStart[0] as number;
                let endTime = lastStop[0] as number;
                if (isNaN(endTime)) {
                  // Fallback: use last start_time if stop_time is NaN
                  const lastStart = await getHdf5DatasetData(
                    nwbUrl,
                    startTimeDataset.path,
                    { slice: [[N - 1, N]] },
                  );
                  if (canceled) return;
                  if (lastStart) endTime = lastStart[0] as number;
                }
                if (!isNaN(startTime) && !isNaN(endTime)) {
                  timeseriesAlignmentDispatch({
                    type: "addItem",
                    item: {
                      path: gr.path,
                      neurodataType: nt,
                      itemType: "timeintervals",
                      startTime,
                      endTime,
                    },
                  });
                }
              }
            }
          }
        } else if (
          nt &&
          !gr.subgroups?.length &&
          !gr.datasets?.find((ds: any) => ds.name === "data") &&
          gr.datasets?.find((ds: any) => ds.name === "timestamps")
        ) {
          // Handle event-like objects (e.g., Events, LabeledEvents, TTLs)
          // that have timestamps but no data dataset
          const timestampsDs = gr.datasets.find(
            (ds: any) => ds.name === "timestamps",
          );
          if (!timestampsDs) return;
          const N = timestampsDs.shape?.[0];
          if (N && N > 0) {
            const v1 = await getHdf5DatasetData(nwbUrl, timestampsDs.path, {
              slice: [[0, 1]],
            });
            if (canceled) return;
            if (!v1) return;
            const v2 = await getHdf5DatasetData(nwbUrl, timestampsDs.path, {
              slice: [[N - 1, N]],
            });
            if (canceled) return;
            if (!v2) return;
            timeseriesAlignmentDispatch({
              type: "addItem",
              item: {
                path: gr.path,
                neurodataType: nt,
                itemType: "events",
                startTime: v1[0],
                endTime: v2[0],
              },
            });
          }
        }
        // Recurse into subgroups in parallel, only visiting groups
        // that are relevant data types or containers that hold them
        const { relevantTypes, containerTypes } = typeSets;
        const childGroups = (gr.subgroups || []).filter((sg) => {
          const sgNt = sg.attrs?.["neurodata_type"];
          if (!sgNt) {
            // Untyped group — only recurse into top-level paths that
            // can contain timeseries data
            if (path === "/") {
              return timeseriesRootPaths.has(sg.name);
            }
            return true;
          }
          return relevantTypes.has(sgNt) || containerTypes.has(sgNt);
        });
        await Promise.all(childGroups.map((sg) => handleGroup(sg.path)));
        if (canceled) return;
      } catch (err) {
        console.warn("Problem processing group", path, err);
      }
    };
    handleGroup("/")
      .then(() => {
        setLoadingMessage("");
      })
      .catch((err) => {
        console.warn("Error loading timeseries alignment", err);
        setLoadingMessage("");
      });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, isExpanded, typeSets]);

  const { startTime, endTime } = useMemo(() => {
    let startTime: number | undefined = undefined;
    let endTime: number | undefined = undefined;
    for (const item of timeseriesAlignment.timeseries) {
      if (hiddenPaths.has(item.path)) continue;
      if (startTime === undefined || item.startTime < startTime)
        startTime = item.startTime;
      if (endTime === undefined || item.endTime > endTime)
        endTime = item.endTime;
    }
    return { startTime, endTime };
  }, [timeseriesAlignment, hiddenPaths]);

  const items = timeseriesAlignment.timeseries;
  const anyHidden = items.some((item) => hiddenPaths.has(item.path));

  return (
    <div style={{ position: "relative", width }}>
      {loadingMessage && <div>{loadingMessage}</div>}
      {items.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            fontSize: 13,
          }}
        >
          <button
            onClick={() =>
              setHiddenPaths(
                anyHidden ? new Set() : new Set(items.map((item) => item.path)),
              )
            }
          >
            {anyHidden ? "Show all" : "Hide all"}
          </button>
          <span style={{ color: "#666" }}>
            {items.length - hiddenPaths.size} of {items.length} shown
          </span>
        </div>
      )}
      {items.map((item) => (
        <div key={item.path} title={item.neurodataType}>
          <TAItemView
            key={item.path}
            item={item}
            startTime={startTime}
            endTime={endTime}
            width={width - 4}
            visible={!hiddenPaths.has(item.path)}
            onToggleVisible={toggleVisible}
            onOpenTimeseriesItem={onOpenTimeseriesItem}
          />
        </div>
      ))}
    </div>
  );
};

type TAItemViewProps = {
  item: TAItem;
  startTime?: number;
  endTime?: number;
  width: number;
  visible: boolean;
  onToggleVisible: (path: string) => void;
  onOpenTimeseriesItem: (path: string) => void;
};

const getColorForNeurodataType = (nt: string) => {
  switch (nt) {
    case "ElectricalSeries":
      return "blue";
    case "TwoPhotonSeries":
      return "green";
    case "OnePhotonSeries":
      return "green";
    case "SpatialSeries":
      return "salmon";
    case "ImageSeries":
      return "orange";
    case "RoiResponseSeries":
      return "purple";
    case "PatchClampSeries":
      return "brown";
    case "IndexSeries":
      return "black";
    case "AbstractFeatureSeries":
      return "yellow";
    case "AnnotationSeries":
      return "slateblue";
    case "IntervalSeries":
      return "magenta";
    case "DecompositionSeries":
      return "lime";
    case "OptogeneticSeries":
      return "pink";
    case "TimeIntervals":
      return "teal";
    case "Events":
      return "darkred";
    case "LabeledEvents":
      return "darkred";
    case "TTLs":
      return "darkred";
    default:
      return "gray";
  }
};

const TAItemView: FunctionComponent<TAItemViewProps> = ({
  item,
  startTime,
  endTime,
  width,
  visible,
  onToggleVisible,
  onOpenTimeseriesItem,
}) => {
  const barHeight = 8;
  const gapAboveBar = 5; // space between the text and the bar
  const gapBelowBar = 14; // space separating this item from the next
  const rawP1 =
    ((item.startTime - (startTime || 0)) /
      ((endTime || 1) - (startTime || 0))) *
    width;
  const rawP2 =
    ((item.endTime - (startTime || 0)) / ((endTime || 1) - (startTime || 0))) *
    width;
  const p1 = Math.min(Math.max(rawP1, 0), width);
  const p2 = Math.min(Math.max(rawP2, 0), width);
  const color = getColorForNeurodataType(item.neurodataType);
  if (item.startTime === undefined)
    return <div>item.startTime is undefined</div>;
  if (item.endTime === undefined) return <div>item.endTime is undefined</div>;
  if (typeof item.startTime !== "number")
    return <div>item.startTime is not a number</div>;
  if (typeof item.endTime !== "number")
    return <div>item.endTime is not a number</div>;
  return (
    <div style={{ width, marginBottom: gapBelowBar }}>
      {/* Text in normal flow so it can wrap to multiple lines without
          overlapping the bar, which is rendered below it */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 4,
          color: visible ? color : "#999",
          fontSize: 14,
        }}
      >
        <input
          type="checkbox"
          checked={visible}
          onChange={() => onToggleVisible(item.path)}
          title="Toggle this item in the alignment view"
          style={{ marginTop: 3, cursor: "pointer", flexShrink: 0 }}
        />
        <span style={{ flexShrink: 0 }} title="Open this item">
          <SmallIconButton
            icon={<FaEye />}
            onClick={() => {
              onOpenTimeseriesItem(item.path);
            }}
          />
        </span>
        <span>
          {item.path} ({item.neurodataType}) [{item.startTime.toFixed(1)} -{" "}
          {item.endTime.toFixed(1)} sec]
        </span>
      </div>
      {visible && (
        <div
          style={{
            position: "relative",
            width,
            height: barHeight,
            marginTop: gapAboveBar,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: p1,
              width: Math.max(p2 - p1, 2),
              height: barHeight,
              background: color,
              borderRadius: 2,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default TimeseriesAlignmentView;
