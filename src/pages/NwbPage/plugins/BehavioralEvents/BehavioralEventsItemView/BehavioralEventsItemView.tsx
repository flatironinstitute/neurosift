/* eslint-disable @typescript-eslint/no-explicit-any */
import { getHdf5DatasetData, useHdf5Group } from "@hdf5Interface";
import TimeScrollView2, {
  useTimeScrollView2,
} from "@shared/component-time-scroll-view-2/TimeScrollView2";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { timeSelectionBarHeight } from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBar";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { BehavioralEventsData, EventSeries, Opts } from "./WorkerTypes";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const yAxisInfo = {
  showTicks: false,
  yMin: undefined,
  yMax: undefined,
};

const hideToolbar = false;

type BehavioralEventsAction =
  | {
      type: "SET_SERIES_NAMES";
      seriesNames: string[];
    }
  | {
      type: "SET_SERIES";
      seriesName: string;
      series: EventSeries;
    };

const behavioralEventsReducer = (
  state: BehavioralEventsData,
  action: BehavioralEventsAction,
): BehavioralEventsData => {
  if (action.type === "SET_SERIES_NAMES") {
    return {
      ...state,
      seriesNames: action.seriesNames,
    };
  } else if (action.type === "SET_SERIES") {
    return {
      ...state,
      series: {
        ...state.series,
        [action.seriesName]: action.series,
      },
    };
  } else return state;
};

const BehavioralEventsItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const [beData, beDataDispatch] = useReducer(behavioralEventsReducer, {
    seriesNames: [],
    series: {},
  });
  const group = useHdf5Group(nwbUrl, path);
  useEffect(() => {
    if (!group) return;
    let canceled = false;
    const load = async () => {
      const timeSeriesGroups = group.subgroups.filter(
        (grp) => grp.attrs["neurodata_type"] === "TimeSeries",
      );
      const seriesNames = timeSeriesGroups.map((grp) => grp.name);
      beDataDispatch({ type: "SET_SERIES_NAMES", seriesNames });
      for (const grp of timeSeriesGroups) {
        const timestampsData = await getHdf5DatasetData(
          nwbUrl,
          grp.path + "/timestamps",
          {},
        );
        if (canceled) return;
        if (!timestampsData) throw Error("Unexpected: timestampsData is null");
        const dataData = await getHdf5DatasetData(
          nwbUrl,
          grp.path + "/data",
          {},
        );
        if (canceled) return;
        if (!dataData) throw Error("Unexpected: dataData is null");
        const categories = uniqueSortedItems(Array.from(dataData));
        beDataDispatch({
          type: "SET_SERIES",
          seriesName: grp.name,
          series: {
            name: grp.name,
            categories,
            timestamps: Array.from(timestampsData),
            data: Array.from(dataData),
          },
        });
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbUrl]);

  return (
    <BehavioralEventsItemViewChild
      width={width}
      height={height}
      beData={beData}
    />
  );
};

type ChildProps = {
  width: number;
  height: number;
  beData: BehavioralEventsData;
};

const leftMargin = 100;

const BehavioralEventsItemViewChild: FunctionComponent<ChildProps> = ({
  width,
  height,
  beData,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);

  const { startTime, endTime } = useMemo(() => {
    const x = Object.values(beData.series);
    if (x.length === 0) return { startTime: undefined, endTime: undefined };
    let startTime = Number.MAX_VALUE;
    let endTime = Number.MIN_VALUE;
    for (const series of x) {
      const t1 = series.timestamps[0];
      const t2 = series.timestamps[series.timestamps.length - 1];
      startTime = Math.min(startTime, t1);
      endTime = Math.max(endTime, t2);
    }
    return { startTime, endTime };
  }, [beData]);
  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  useEffect(() => {
    if (startTime === undefined) return;
    if (endTime === undefined) return;
    const t1 = startTime;
    const t2 = endTime;
    initializeTimeseriesSelection({
      startTimeSec: startTime,
      endTimeSec: endTime,
      initialVisibleStartTimeSec: t1,
      initialVisibleEndTimeSec: t2,
    });
  }, [startTime, endTime, initializeTimeseriesSelection]);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - timeSelectionBarHeight,
    hideToolbar,
    leftMargin,
  });

  // Set worker
  useEffect(() => {
    if (!canvasElement) return;
    const worker = new Worker(new URL("./worker", import.meta.url));
    let offscreenCanvas: OffscreenCanvas;
    try {
      offscreenCanvas = canvasElement.transferControlToOffscreen();
    } catch (err) {
      console.warn(err);
      console.warn(
        "Unable to transfer control to offscreen canvas (expected during dev)",
      );
      return;
    }
    worker.postMessage(
      {
        canvas: offscreenCanvas,
      },
      [offscreenCanvas],
    );

    setWorker(worker);

    return () => {
      worker.terminate();
    };
  }, [canvasElement]);

  // Set opts
  useEffect(() => {
    if (!worker) return;
    if (visibleStartTimeSec === undefined) return;
    if (visibleEndTimeSec === undefined) return;
    const opts: Opts = {
      canvasWidth,
      canvasHeight,
      margins,
      visibleStartTimeSec,
      visibleEndTimeSec,
    };
    worker.postMessage({
      opts,
    });
  }, [
    worker,
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  // Set beData
  useEffect(() => {
    if (!worker) return;
    worker.postMessage({
      beData,
    });
  }, [beData, worker]);

  return (
    <TimeScrollView2
      width={width}
      height={height}
      onCanvasElement={setCanvasElement}
      gridlineOpts={gridlineOpts}
      yAxisInfo={yAxisInfo}
      hideToolbar={hideToolbar}
      showTimeSelectionBar={true}
      leftMargin={leftMargin}
    />
  );
};

const uniqueSortedItems = (items: any[]) => {
  const ret: any[] = [];
  for (const item of items) {
    if (!ret.includes(item)) ret.push(item);
  }
  return ret.sort();
};

export default BehavioralEventsItemView;
