/* eslint-disable @typescript-eslint/no-explicit-any */
import { SmallIconButton } from "@fi-sci/misc";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { FaEye } from "react-icons/fa";
import { getNwbDatasetData, getNwbGroup } from "./nwbInterface";

type Props = {
  nwbUrl: string;
  width: number;
  isExpanded?: boolean;
  onOpenTimeseriesItem: (path: string) => void;
};

type TAItem = {
  path: string;
  neurodataType: string;
  startTime: number;
  endTime: number;
};

type TimeseriesAlignmentState = {
  timeseries: TAItem[];
};

type TimeseriesAlignmentAction = {
  type: "addItem";
  item: TAItem;
};

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
    default:
      return state;
  }
};

const TimeseriesAlignmentView: FunctionComponent<Props> = ({
  nwbUrl,
  width,
  isExpanded,
  onOpenTimeseriesItem,
}) => {
  const [timeseriesAlignment, timeseriesAlignmentDispatch] = useReducer(
    timeseriesAlignmentReducer,
    { timeseries: [] },
  );
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    if (!isExpanded) return;
    setLoadingMessage("Loading...");
    let canceled = false;
    const handleGroup = async (path: string) => {
      setLoadingMessage(`Loading ${path}...`);
      const gr = await getNwbGroup(nwbUrl, path);
      if (canceled) return;
      if (!gr) return;
      const nt = gr.attrs["neurodata_type"];
      const isTimeseriesObject = await checkIsTimeseriesObject(gr);
      if (isTimeseriesObject) {
        try {
          const timestampsSubdataset = gr.datasets.find(
            (ds) => ds.name === "timestamps",
          );
          const startingTimeSubdataset = gr.datasets.find(
            (ds) => ds.name === "starting_time",
          );
          const dataSubdataset = gr.datasets.find((ds) => ds.name === "data");
          if (timestampsSubdataset) {
            const v1 = await getNwbDatasetData(
              nwbUrl,
              timestampsSubdataset.path,
              {
                slice: [[0, 1]],
              },
            );
            if (canceled) return;
            if (!v1) return;
            const N = timestampsSubdataset.shape[0];
            const v2 = await getNwbDatasetData(
              nwbUrl,
              timestampsSubdataset.path,
              {
                slice: [[N - 1, N]],
              },
            );
            if (canceled) return;
            if (!v2) return;
            const startTime = v1[0];
            const endTime = v2[0];
            timeseriesAlignmentDispatch({
              type: "addItem",
              item: {
                path: gr.path,
                neurodataType: nt,
                startTime,
                endTime,
              },
            });
          } else if (startingTimeSubdataset && dataSubdataset) {
            const v = await getNwbDatasetData(
              nwbUrl,
              startingTimeSubdataset.path,
              {},
            );
            if (canceled) return;
            const startTime = v as any as number;
            const rate = startingTimeSubdataset.attrs["rate"];
            const endTime = startTime + (dataSubdataset.shape[0] - 1) / rate;
            timeseriesAlignmentDispatch({
              type: "addItem",
              item: {
                path: gr.path,
                neurodataType: nt,
                startTime,
                endTime,
              },
            });
          }
        } catch (err) {
          console.warn("Problem processing group", gr.path);
          console.warn(err);
        }
      } else {
        for (const sg of gr.subgroups) {
          await handleGroup(sg.path);
          if (canceled) return;
        }
      }
    };
    handleGroup("/").then(() => {
      setLoadingMessage("");
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl, isExpanded]);

  const { startTime, endTime } = useMemo(() => {
    let startTime: number | undefined = undefined;
    let endTime: number | undefined = undefined;
    for (const item of timeseriesAlignment.timeseries) {
      if (startTime === undefined || item.startTime < startTime)
        startTime = item.startTime;
      if (endTime === undefined || item.endTime > endTime)
        endTime = item.endTime;
    }
    return { startTime, endTime };
  }, [timeseriesAlignment]);

  return (
    <div style={{ position: "relative", width }}>
      {loadingMessage && <div>{loadingMessage}</div>}
      {timeseriesAlignment.timeseries.map((item) => (
        <div key={item.path} title={item.neurodataType}>
          <TAItemView
            key={item.path}
            item={item}
            startTime={startTime}
            endTime={endTime}
            width={width - 4}
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
      return "cyan";
    case "IntervalSeries":
      return "magenta";
    case "DecompositionSeries":
      return "lime";
    case "OptogeneticSeries":
      return "pink";
    default:
      return "gray";
  }
};

const TAItemView: FunctionComponent<TAItemViewProps> = ({
  item,
  startTime,
  endTime,
  width,
  onOpenTimeseriesItem,
}) => {
  const h1 = 18;
  const h2 = 7;
  const h3 = 15;
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
    <div style={{ position: "relative", width, height: h1 + h2 + h3 }}>
      <div
        style={{ position: "absolute", width, height: h1, color, fontSize: 14 }}
      >
        <SmallIconButton
          icon={<FaEye />}
          onClick={() => {
            onOpenTimeseriesItem(item.path);
          }}
        />
        &nbsp;
        {item.path} ({item.neurodataType}) [{item.startTime.toFixed(1)} -{" "}
        {item.endTime.toFixed(1)} sec]
      </div>
      <div
        style={{
          position: "absolute",
          left: p1,
          width: Math.max(p2 - p1, 2),
          height: h2,
          top: h1,
          background: color,
        }}
      />
    </div>
  );
};

const checkIsTimeseriesObject = async (gr: any) => {
  const nt = gr.attrs["neurodata_type"];
  if (!nt) return false;
  if (!gr.datasets.find((ds: any) => ds.name === "data")) return false;
  if (gr.datasets.find((ds: any) => ds.name === "timestamps")) return true;
  if (gr.datasets.find((ds: any) => ds.name === "starting_time")) return true;
  return false;
};

export default TimeseriesAlignmentView;
