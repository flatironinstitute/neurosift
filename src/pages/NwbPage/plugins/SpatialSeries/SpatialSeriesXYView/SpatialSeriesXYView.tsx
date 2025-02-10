import { useNwbDataset } from "@nwbInterface";
import { Canceler } from "@remote-h5-file";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "@shared/TimeseriesSelectionBar/TimeseriesSelectionBar";
import { useTimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import { FunctionComponent, useEffect, useState } from "react";
import PlotlyComponent from "./PlotlyComponent";
import TimeseriesDatasetChunkingClient from "./TimeseriesDatasetChunkingClient";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
};

interface PlotData {
  x: number[];
  y: number[];
  t: number[];
}

const SpatialSeriesXYView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const [datasetChunkingClient, setDatasetChunkingClient] = useState<
    TimeseriesDatasetChunkingClient | undefined
  >(undefined);
  const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange();

  const dataset = useNwbDataset(nwbUrl, `${path}/data`);

  const dataClient = useTimeseriesTimestampsClient(nwbUrl, path);
  // const startTime = dataClient ? dataClient.startTime! : undefined;
  // const endTime = dataClient ? dataClient.endTime! : undefined;
  // useTimeseriesSelectionInitialization(startTime, endTime);

  const { setCurrentTime, currentTime } = useTimeseriesSelection();

  // Set chunkSize
  const chunkSize = dataset ? Math.floor(1e4 / (dataset.shape[1] || 1)) : 0;

  // // set visible time range
  // useEffect(() => {
  //   if (!chunkSize) return;
  //   if (!dataClient) return;
  //   if (startTime === undefined) return;
  //   if (endTime === undefined) return;
  //   if (visibleStartTimeSec !== undefined) return;
  //   if (visibleEndTimeSec !== undefined) return;
  //   setVisibleTimeRange(
  //     startTime,
  //     startTime +
  //       Math.min(
  //         (chunkSize / dataClient.estimatedSamplingFrequency!) * 3,
  //         endTime,
  //       ),
  //   );
  // }, [
  //   chunkSize,
  //   dataClient,
  //   setVisibleTimeRange,
  //   startTime,
  //   endTime,
  //   visibleStartTimeSec,
  //   visibleEndTimeSec,
  // ]);

  // Set the datasetChunkingClient
  useEffect(() => {
    if (!nwbUrl) return;
    if (!dataset) return;
    const client = new TimeseriesDatasetChunkingClient(
      nwbUrl,
      dataset,
      chunkSize,
      {
        ignoreConversion: false,
      },
    );
    setDatasetChunkingClient(client);
  }, [dataset, nwbUrl, chunkSize]);

  // Set startChunkIndex and endChunkIndex
  const [startChunkIndex, setStartChunkIndex] = useState<number | undefined>(
    undefined,
  );
  const [endChunkIndex, setEndChunkIndex] = useState<number | undefined>(
    undefined,
  );
  const [zoomInRequired, setZoomInRequired] = useState<boolean>(false);
  useEffect(() => {
    if (
      !dataset ||
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined ||
      !dataClient
    ) {
      setStartChunkIndex(undefined);
      setEndChunkIndex(undefined);
      setZoomInRequired(false);
      return;
    }
    let canceled = false;
    const load = async () => {
      const maxVisibleDuration =
        1e6 / (dataset.shape[1] || 1) / dataClient.estimatedSamplingFrequency!;
      const zoomInRequired =
        visibleEndTimeSec - visibleStartTimeSec > maxVisibleDuration;
      if (zoomInRequired) {
        setStartChunkIndex(undefined);
        setEndChunkIndex(undefined);
        setZoomInRequired(true);
        return;
      }
      const iStart = await dataClient.getDataIndexForTime(visibleStartTimeSec);
      if (canceled) return;
      const iEnd = await dataClient.getDataIndexForTime(visibleEndTimeSec);
      if (canceled) return;
      const startChunkIndex = Math.floor(iStart / chunkSize);
      const endChunkIndex = Math.floor(iEnd / chunkSize) + 1;
      setStartChunkIndex(startChunkIndex);
      setEndChunkIndex(endChunkIndex);
      setZoomInRequired(zoomInRequired);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [dataset, visibleStartTimeSec, visibleEndTimeSec, chunkSize, dataClient]);

  const [loading, setLoading] = useState<boolean>(false);

  // Set plotData
  const [plotData, setPlotData] = useState<PlotData | undefined>(undefined);
  useEffect(() => {
    if (!datasetChunkingClient) return;
    if (dataset === undefined) return;
    if (startChunkIndex === undefined) return;
    if (endChunkIndex === undefined) return;
    if (dataClient === undefined) return;
    if (zoomInRequired) return;

    let canceler: Canceler | undefined = undefined;
    let canceled = false;
    const load = async () => {
      if (visibleStartTimeSec === undefined) return;
      if (visibleEndTimeSec === undefined) return;
      let finished = false;
      const tt = await dataClient.getTimestampsForDataIndices(
        startChunkIndex * chunkSize,
        endChunkIndex * chunkSize,
      );
      if (!tt)
        throw Error(
          `Unable to get timestamps for data indices ${startChunkIndex * chunkSize} to ${endChunkIndex * chunkSize}`,
        );
      setLoading(true);
      while (!finished) {
        try {
          canceler = { onCancel: [] };
          const { concatenatedChunk, completed } =
            await datasetChunkingClient.getConcatenatedChunk(
              startChunkIndex,
              endChunkIndex,
              canceler,
            );
          canceler = undefined;
          if (completed) finished = true;
          if (canceled) return;
          const data: PlotData = {
            t: Array.from(tt),
            x: Array.from(concatenatedChunk[0] || []),
            y: Array.from(concatenatedChunk[1] || []),
          };
          // only use the times that are in the visible time range
          const indices: number[] = [];
          for (let i = 0; i < data.t.length; i++) {
            if (
              data.t[i] >= visibleStartTimeSec &&
              data.t[i] <= visibleEndTimeSec
            ) {
              indices.push(i);
            }
          }
          data.t = indices.map((i) => data.t[i]);
          data.x = indices.map((i) => data.x[i]);
          data.y = indices.map((i) => data.y[i]);
          setPlotData(data);
        } catch (err: unknown) {
          if (err instanceof Error && err.message !== "canceled") {
            throw err;
          }
        }
      }
      setLoading(false);
    };
    load();
    return () => {
      canceled = true;
      if (canceler) canceler.onCancel.forEach((cb) => cb());
    };
  }, [
    datasetChunkingClient,
    startChunkIndex,
    endChunkIndex,
    dataClient,
    dataset,
    chunkSize,
    zoomInRequired,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  const plotHeight = height - timeSelectionBarHeight;

  // Set valueRange
  const [valueRange, setValueRange] = useState<
    { xMin: number; xMax: number; yMin: number; yMax: number } | undefined
  >(undefined);
  useEffect(() => {
    if (!plotData) return;
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < plotData.x.length; i++) {
      if (plotData.x[i] < xMin) xMin = plotData.x[i];
      if (plotData.x[i] > xMax) xMax = plotData.x[i];
      if (plotData.y[i] < yMin) yMin = plotData.y[i];
      if (plotData.y[i] > yMax) yMax = plotData.y[i];
    }
    setValueRange((old) => {
      const xMin2 = old ? Math.min(old.xMin, xMin) : xMin;
      const xMax2 = old ? Math.max(old.xMax, xMax) : xMax;
      const yMin2 = old ? Math.min(old.yMin, yMin) : yMin;
      const yMax2 = old ? Math.max(old.yMax, yMax) : yMax;
      return { xMin: xMin2, xMax: xMax2, yMin: yMin2, yMax: yMax2 };
    });
  }, [plotData]);

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{ position: "absolute", width, height: timeSelectionBarHeight }}
      >
        <TimeseriesSelectionBar
          width={width}
          height={timeSelectionBarHeight - 5}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: timeSelectionBarHeight,
          width,
          height: plotHeight,
        }}
      >
        {plotData && (
          <PlotlyComponent
            data={plotData}
            width={width}
            height={plotHeight}
            onPointClick={(index) => {
              if (plotData.t[index] !== undefined) {
                setCurrentTime(plotData.t[index]);
              }
            }}
            currentTime={currentTime}
            valueRange={valueRange}
            unit={dataset?.attrs["unit"]}
          />
        )}
      </div>
      {loading && !zoomInRequired && (
        <div
          style={{
            position: "absolute",
            top: timeSelectionBarHeight + 20,
            left: 60,
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: 20, color: "gray" }}>Loading...</div>
        </div>
      )}
    </div>
  );
};

export default SpatialSeriesXYView;
