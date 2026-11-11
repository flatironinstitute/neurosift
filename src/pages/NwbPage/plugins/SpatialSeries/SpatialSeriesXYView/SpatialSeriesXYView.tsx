import { useHdf5Dataset } from "@hdf5Interface";
import { Canceler } from "@remote-h5-file";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import { useTimeseriesTimestampsClient } from "@shared/TimeseriesTimestampsClient/TimeseriesTimestampsClient";
import { LoadingState, TooMuchData } from "@ui";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import TimeView, {
  TIME_VIEW_CHROME,
  TIME_VIEW_INSET,
} from "../../common/TimeView";
import { useWindowPlayback } from "../../common/usePlayback";
import { useTimeWindow } from "../../common/useTimeWindow";
import { timeseriesSummary } from "../../simple-timeseries/timeseriesSummary";
import PlotlyComponent from "./PlotlyComponent";
import TimeseriesDatasetChunkingClient from "./TimeseriesDatasetChunkingClient";
import { tooMuchToDraw } from "./tooMuchToDraw";

/** Longer windows redraw too many points to play smoothly. */
const PLAYBACK_WINDOW_SEC = 30;

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

/** Whole chunks around the window, so moving it within them needs no reload. */
interface LoadedChunks extends PlotData {
  startChunk: number;
  endChunk: number;
  complete: boolean;
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

  const dataset = useHdf5Dataset(nwbUrl, `${path}/data`);
  const unit = dataset?.attrs?.unit;

  const dataClient = useTimeseriesTimestampsClient(nwbUrl, path);
  const startTime = dataClient ? dataClient.startTime! : undefined;
  const endTime = dataClient ? dataClient.endTime! : undefined;
  const { initializeTimeseriesSelection } = useTimeseriesSelection();
  useEffect(() => {
    if (!dataClient) return;
    const estimatedSamplingFrequency = dataClient.estimatedSamplingFrequency;
    if (estimatedSamplingFrequency === undefined) return;
    if (startTime === undefined) return;
    if (endTime === undefined) return;
    const initialVisibleDuration = 1e4 / estimatedSamplingFrequency;
    initializeTimeseriesSelection({
      startTimeSec: startTime,
      endTimeSec: endTime,
      initialVisibleStartTimeSec: startTime,
      initialVisibleEndTimeSec: Math.min(
        startTime + initialVisibleDuration,
        endTime,
      ),
    });
  }, [dataClient, startTime, endTime, initializeTimeseriesSelection]);

  const { currentTime } = useTimeseriesSelection();

  // Set chunkSize
  const chunkSize = dataset ? Math.floor(1e4 / (dataset.shape[1] || 1)) : 0;

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
  const [acceptedDuration, setAcceptedDuration] = useState(0);
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
      const zoomInRequired = tooMuchToDraw({
        duration: visibleEndTimeSec - visibleStartTimeSec,
        channels: dataset.shape[1],
        samplingFrequency: dataClient.estimatedSamplingFrequency!,
        acceptedDuration,
      });
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
  }, [
    dataset,
    visibleStartTimeSec,
    visibleEndTimeSec,
    chunkSize,
    dataClient,
    acceptedDuration,
  ]);

  const [loading, setLoading] = useState<boolean>(false);

  const [loaded, setLoaded] = useState<LoadedChunks | undefined>(undefined);
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
          setLoaded({
            t: Array.from(tt),
            x: Array.from(concatenatedChunk[0] || []),
            y: Array.from(concatenatedChunk[1] || []),
            startChunk: startChunkIndex,
            endChunk: endChunkIndex,
            complete: completed,
          });
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
  ]);

  // Only the times in the visible window.
  const plotData = useMemo((): PlotData | undefined => {
    if (!loaded) return undefined;
    if (visibleStartTimeSec === undefined || visibleEndTimeSec === undefined)
      return undefined;
    const indices: number[] = [];
    for (let i = 0; i < loaded.t.length; i++) {
      if (
        loaded.t[i] >= visibleStartTimeSec &&
        loaded.t[i] <= visibleEndTimeSec
      )
        indices.push(i);
    }
    return {
      t: indices.map((i) => loaded.t[i]),
      x: indices.map((i) => loaded.x[i]),
      y: indices.map((i) => loaded.y[i]),
    };
  }, [loaded, visibleStartTimeSec, visibleEndTimeSec]);
  const holding =
    !zoomInRequired &&
    (!loaded ||
      !loaded.complete ||
      startChunkIndex === undefined ||
      endChunkIndex === undefined ||
      loaded.startChunk > startChunkIndex ||
      loaded.endChunk < endChunkIndex);

  const plotHeight = Math.max(height - TIME_VIEW_CHROME, 200);

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

  const time = useTimeWindow();
  const playback = useWindowPlayback(PLAYBACK_WINDOW_SEC);
  const samplingFrequency = dataClient?.estimatedSamplingFrequency;
  if (
    !dataset ||
    startTime === undefined ||
    endTime === undefined ||
    samplingFrequency === undefined
  )
    return <LoadingState label="Reading the positions" phase="loading" />;

  const duration = time.value.duration;
  const seconds = duration.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  const positions = Math.round(duration * samplingFrequency).toLocaleString(
    "en-US",
  );
  let plot;
  if (zoomInRequired)
    plot = (
      <TooMuchData
        zoomLabel="Zoom in"
        onZoom={() =>
          time.onChange({
            start: time.value.start + duration / 4,
            duration: duration / 2,
          })
        }
        onDrawAnyway={() => setAcceptedDuration(duration)}
      >
        {`This window holds about ${positions} positions over ${seconds} s, more than Neurosift draws at once. Zoom in, drag across the overview above to pick a shorter stretch, or draw it anyway.`}
      </TooMuchData>
    );
  else if (plotData)
    plot = (
      <PlotlyComponent
        data={plotData}
        width={width - TIME_VIEW_INSET}
        height={plotHeight}
        currentTime={currentTime}
        valueRange={valueRange}
        unit={unit}
      />
    );
  else plot = <LoadingState label="Reading the positions" phase="loading" />;

  return (
    <TimeView
      label={path.split("/").pop() || path}
      summary={timeseriesSummary({
        timeseriesStartTime: startTime,
        timeseriesDuration: endTime - startTime,
        samplingFrequency,
        totalNumChannels: dataset.shape[1] ?? 1,
      })}
      busy={loading && !zoomInRequired}
      playback={playback}
      holding={holding}
    >
      {plot}
    </TimeView>
  );
};

export default SpatialSeriesXYView;
