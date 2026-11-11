/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCssVars } from "@components/useCssVars";
import {
  Button,
  Checkbox,
  IconButton,
  Legend,
  LoadingState,
  ViewPanel,
} from "@ui";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { getHdf5DatasetData, getHdf5Group } from "./hdf5Interface";
import {
  useNwbFileSpecifications,
  NwbFileSpecifications,
} from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import {
  neurodataTypeInheritsFrom,
  neurodataTypeInheritsFromAny,
} from "./neurodataTypeInheritance";
import "./TimeseriesAlignmentView.css";

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
  const relevantTypes = new Set<string>();
  const containerTypes = new Set<string>();
  for (const g of specs.allGroups) {
    const def = g.neurodata_type_def;
    if (
      neurodataTypeInheritsFromAny(
        def,
        ["TimeSeries", "TimeIntervals", "Events"],
        specs,
      )
    ) {
      relevantTypes.add(def);
    } else if (
      neurodataTypeInheritsFromAny(
        def,
        ["NWBDataInterface", "ProcessingModule"],
        specs,
      )
    ) {
      containerTypes.add(def);
    }
  }
  return { relevantTypes, containerTypes };
};

const TimeseriesAlignmentView: FunctionComponent<Props> = ({
  nwbUrl,
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
        // A series is recognized by its type, not by having no subgroups:
        // TwoPhotonSeries, PatchClampSeries, OptogeneticSeries, and ImageSeries
        // carry links to an imaging plane, electrode, site, or device, which
        // the reader lists as subgroups.
        const isTimeseries =
          nt &&
          neurodataTypeInheritsFrom(nt, "TimeSeries", specifications) &&
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
        } else if (
          neurodataTypeInheritsFrom(nt, "TimeIntervals", specifications)
        ) {
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
        // A series' subgroups are links to metadata (imaging plane,
        // electrode, device), never further series, so stop here.
        if (isTimeseries) return;
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
  }, [nwbUrl, isExpanded, typeSets, specifications]);

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
  // Types in name order take the six series steps, so a file's colors stay put as items arrive.
  const types = useMemo(
    () => [...new Set(items.map((item) => item.neurodataType))].sort(),
    [items],
  );
  const shown = items.length - hiddenPaths.size;
  const summary =
    items.length === 0
      ? loadingMessage
        ? "Finding the time series, intervals and events in this file."
        : "This file has no time series, intervals or events with times."
      : `${items.length} time series, intervals and events` +
        (startTime !== undefined && endTime !== undefined
          ? `; the ${shown === items.length ? "" : "shown "}items span ${startTime.toFixed(1)} to ${endTime.toFixed(1)} s.`
          : ".");

  return (
    <ViewPanel
      label="Timeseries alignment"
      summary={summary}
      busy={!!loadingMessage}
      controls={
        items.length > 0 && (
          <>
            <Button
              size="sm"
              onClick={() =>
                setHiddenPaths(
                  anyHidden
                    ? new Set()
                    : new Set(items.map((item) => item.path)),
                )
              }
            >
              {anyHidden ? "Show all" : "Hide all"}
            </Button>
            <span className="alignment-count">
              {shown} of {items.length} shown
            </span>
          </>
        )
      }
    >
      {loadingMessage && items.length === 0 ? (
        <LoadingState label="Finding the time series" phase="loading" />
      ) : (
        <div className="alignment-chart">
          <ul className="alignment-list" aria-label="Times of each item">
            {items.map((item) => (
              <TAItemView
                key={item.path}
                item={item}
                startTime={startTime}
                endTime={endTime}
                series={types.indexOf(item.neurodataType) + 1}
                visible={!hiddenPaths.has(item.path)}
                onToggleVisible={toggleVisible}
                onOpenTimeseriesItem={onOpenTimeseriesItem}
              />
            ))}
          </ul>
          {types.length > 0 && (
            <Legend
              label="Neurodata types"
              items={types.map((name, index) => ({ name, series: index + 1 }))}
            />
          )}
        </div>
      )}
    </ViewPanel>
  );
};

type TAItemViewProps = {
  item: TAItem;
  startTime?: number;
  endTime?: number;
  /** The data/series step, 1 to 6; past six the other color. */
  series: number;
  visible: boolean;
  onToggleVisible: (path: string) => void;
  onOpenTimeseriesItem: (path: string) => void;
};

const percent = (x: number) => `${Math.min(Math.max(x, 0), 1) * 100}%`;

const TAItemView: FunctionComponent<TAItemViewProps> = ({
  item,
  startTime,
  endTime,
  series,
  visible,
  onToggleVisible,
  onOpenTimeseriesItem,
}) => {
  const t0 = startTime || 0;
  const span = (endTime || 1) - t0;
  const from = (item.startTime - t0) / span;
  const to = (item.endTime - t0) / span;
  const barRef = useCssVars<HTMLSpanElement>({
    "--bar-start": percent(from),
    "--bar-end": percent(1 - to),
  });
  if (item.startTime === undefined) return <li>item.startTime is undefined</li>;
  if (item.endTime === undefined) return <li>item.endTime is undefined</li>;
  if (typeof item.startTime !== "number")
    return <li>item.startTime is not a number</li>;
  if (typeof item.endTime !== "number")
    return <li>item.endTime is not a number</li>;
  const step = series >= 1 && series <= 6 ? series : "other";
  return (
    <li
      className={
        visible ? "alignment-item" : "alignment-item alignment-item--hidden"
      }
      title={item.neurodataType}
    >
      <div className="alignment-head">
        <Checkbox
          label={`Show ${item.path} in the alignment`}
          hideLabel
          checked={visible}
          onChange={() => onToggleVisible(item.path)}
        />
        <IconButton
          icon="view"
          label={`Open ${item.path}`}
          size="sm"
          variant="ghost"
          onClick={() => onOpenTimeseriesItem(item.path)}
        />
        <span className="alignment-path">{item.path}</span>
        <span className="alignment-meta">
          {item.neurodataType} · {item.startTime.toFixed(1)} –{" "}
          {item.endTime.toFixed(1)} s
        </span>
      </div>
      {visible && (
        <span className="alignment-track" aria-hidden="true">
          <span
            ref={barRef}
            className={`alignment-bar alignment-bar--${step}`}
          />
        </span>
      )}
    </li>
  );
};

export default TimeseriesAlignmentView;
