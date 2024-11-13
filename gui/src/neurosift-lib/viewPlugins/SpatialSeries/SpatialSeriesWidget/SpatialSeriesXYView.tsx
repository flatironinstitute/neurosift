/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Canceler } from "../../../remote-h5-file/index";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useTimeRange,
  useTimeseriesSelection,
  useTimeseriesSelectionInitialization,
} from "../../../contexts/context-timeseries-selection";
import { useNwbFile } from "../../../misc/NwbFileContext";
import { useDataset } from "../../../misc/hooks";
import { useTimeseriesTimestampsClient } from "../../TimeSeries/TimeseriesItemView/TimeseriesTimestampsClient";
import TimeseriesDatasetChunkingClient from "../../TimeSeries/TimeseriesItemView/TimeseriesDatasetChunkingClient";
import TimeseriesSelectionBar, {
  timeSelectionBarHeight,
} from "../../../timeseries/TimeseriesSelectionBar";
import { DataSeries, Opts } from "./SpatialWorkerTypes";

type Props = {
  width: number;
  height: number;
  path: string;
};

const SpatialSeriesXYView: FunctionComponent<Props> = ({
  width,
  height,
  path,
}) => {
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const [worker, setWorker] = useState<Worker | null>(null);
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const [datasetChunkingClient, setDatasetChunkingClient] = useState<
    TimeseriesDatasetChunkingClient | undefined
  >(undefined);
  const { visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } =
    useTimeRange();

  const dataset = useDataset(nwbFile, `${path}/data`);

  const dataClient = useTimeseriesTimestampsClient(nwbFile, path);
  const startTime = dataClient ? dataClient.startTime! : undefined;
  const endTime = dataClient ? dataClient.endTime! : undefined;
  useTimeseriesSelectionInitialization(startTime, endTime);

  const { setCurrentTime } = useTimeseriesSelection();

  // Set chunkSize
  const chunkSize = useMemo(
    () => (dataset ? Math.floor(1e4 / (dataset.shape[1] || 1)) : 0),
    [dataset],
  );

  // set visible time range
  useEffect(() => {
    if (!chunkSize) return;
    if (!dataClient) return;
    if (startTime === undefined) return;
    if (endTime === undefined) return;
    if (visibleStartTimeSec !== undefined) return;
    if (visibleEndTimeSec !== undefined) return;
    setVisibleTimeRange(
      startTime,
      startTime +
        Math.min(
          (chunkSize / dataClient.estimatedSamplingFrequency!) * 3,
          endTime,
        ),
    );
  }, [
    chunkSize,
    dataClient,
    setVisibleTimeRange,
    startTime,
    endTime,
    visibleStartTimeSec,
    visibleEndTimeSec,
  ]);

  // Set the datasetChunkingClient
  useEffect(() => {
    if (!nwbFile) return;
    if (!dataset) return;
    const client = new TimeseriesDatasetChunkingClient(
      nwbFile,
      dataset,
      chunkSize,
      {
        ignoreConversion: false,
      },
    );
    setDatasetChunkingClient(client);
  }, [dataset, nwbFile, chunkSize]);

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

  // Set dataSeries
  const [dataSeries, setDataSeries] = useState<DataSeries | undefined>(
    undefined,
  );
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
          const dataSeries: DataSeries = {
            t: Array.from(tt),
            x: [],
            y: [],
          };
          for (let i = 0; i < (concatenatedChunk[0] || []).length; i++) {
            dataSeries.x.push(concatenatedChunk[0][i]);
            dataSeries.y.push(concatenatedChunk[1][i]);
          }
          setDataSeries(dataSeries);
        } catch (err: any) {
          if (err.message !== "canceled") {
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

  const canvasWidth = width;
  const canvasHeight = height - timeSelectionBarHeight;
  const margins = useMemo(
    () => ({ left: 60, right: 20, top: 20, bottom: 30 }),
    [],
  );

  // Set valueRange
  const [valueRange, setValueRange] = useState<
    { xMin: number; xMax: number; yMin: number; yMax: number } | undefined
  >(undefined);
  useEffect(() => {
    if (!dataSeries) return;
    let xMin = Number.POSITIVE_INFINITY;
    let xMax = Number.NEGATIVE_INFINITY;
    let yMin = Number.POSITIVE_INFINITY;
    let yMax = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < dataSeries.t.length; i++) {
      if (dataSeries.x[i] < xMin) xMin = dataSeries.x[i];
      if (dataSeries.x[i] > xMax) xMax = dataSeries.x[i];
      if (dataSeries.y[i] < yMin) yMin = dataSeries.y[i];
      if (dataSeries.y[i] > yMax) yMax = dataSeries.y[i];
    }
    setValueRange((old) => {
      const xMin2 = old ? Math.min(old.xMin, xMin) : xMin;
      const xMax2 = old ? Math.max(old.xMax, xMax) : xMax;
      const yMin2 = old ? Math.min(old.yMin, yMin) : yMin;
      const yMax2 = old ? Math.max(old.yMax, yMax) : yMax;
      return { xMin: xMin2, xMax: xMax2, yMin: yMin2, yMax: yMax2 };
    });
  }, [dataSeries]);

  // set opts
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
      xMin: valueRange ? valueRange.xMin : 0,
      xMax: valueRange ? valueRange.xMax : 1,
      yMin: valueRange ? valueRange.yMin : 0,
      yMax: valueRange ? valueRange.yMax : 1,
      xAxisLabel: dataset?.attrs["unit"] || "",
      yAxisLabel: dataset?.attrs["unit"] || "",
      zoomInRequired,
    };
    worker.postMessage({
      opts,
    });
  }, [
    canvasWidth,
    canvasHeight,
    margins,
    visibleStartTimeSec,
    visibleEndTimeSec,
    worker,
    valueRange,
    zoomInRequired,
    dataset?.attrs,
  ]);

  // Set worker
  useEffect(() => {
    if (!canvasElement) return;
    const worker = new Worker(new URL("./spatialWorker", import.meta.url));
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

  // Send dataseries to worker
  useEffect(() => {
    if (!worker) return;
    if (!dataSeries) return;
    worker.postMessage({
      dataSeries,
    });
  }, [worker, dataSeries]);

  const onCanvasElement = useCallback((elmt: HTMLCanvasElement) => {
    setCanvasElement(elmt);
  }, []);

  const { coordToPixel, pixelToCoord } = useMemo(() => {
    if (!valueRange)
      return { coordToPixel: undefined, pixelToCoord: undefined };
    const { xMin, xMax, yMin, yMax } = valueRange;
    const scale = Math.min(
      (canvasWidth - margins.left - margins.right) / (xMax - xMin),
      (canvasHeight - margins.top - margins.bottom) / (yMax - yMin),
    );
    const offsetX =
      (canvasWidth - margins.left - margins.right - (xMax - xMin) * scale) / 2;
    const offsetY =
      (canvasHeight - margins.top - margins.bottom - (yMax - yMin) * scale) / 2;
    const coordToPixel = (p: { x: number; y: number }) => ({
      x: !isNaN(p.x) ? margins.left + offsetX + (p.x - xMin) * scale : NaN,
      y: !isNaN(p.y)
        ? canvasHeight - margins.bottom - offsetY - (p.y - yMin) * scale
        : NaN,
    });
    const pixelToCoord = (p: { x: number; y: number }) => ({
      x: !isNaN(p.x) ? xMin + (p.x - margins.left - offsetX) / scale : NaN,
      y: !isNaN(p.y)
        ? yMin + (canvasHeight - margins.bottom - offsetY - p.y) / scale
        : NaN,
    });
    return { coordToPixel, pixelToCoord };
  }, [canvasWidth, canvasHeight, margins, valueRange]);

  const [cursorCanvasElement, setCursorCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();
  const { currentTime } = useTimeseriesSelection();
  useEffect(() => {
    if (!cursorCanvasElement) return;
    const context = cursorCanvasElement.getContext("2d");
    if (!context) return;

    context.clearRect(0, 0, canvasWidth, canvasHeight);

    if (currentTime === undefined) return;
    if (!dataSeries) return;
    if (!coordToPixel) return;

    const i = findIndexForTime(currentTime, dataSeries.t);
    if (i === undefined) return;
    const x = dataSeries.x[i];
    const y = dataSeries.y[i];

    const pp = coordToPixel({ x, y });

    context.fillStyle = "red";
    context.beginPath();
    context.arc(pp.x, pp.y, 5, 0, 2 * Math.PI);
    context.fill();
  }, [
    cursorCanvasElement,
    currentTime,
    dataSeries,
    coordToPixel,
    valueRange,
    canvasWidth,
    canvasHeight,
    margins,
  ]);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!pixelToCoord) return;
      if (!dataSeries) return;
      if (visibleStartTimeSec === undefined) return;
      if (visibleEndTimeSec === undefined) return;
      const boundingRect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - boundingRect.x;
      const y = e.clientY - boundingRect.y;
      const p = pixelToCoord({ x, y });
      if (isNaN(p.x)) return;
      if (isNaN(p.y)) return;
      let closestT: number | undefined = undefined;
      let closestDistance: number | undefined = undefined;
      for (let i = 0; i < dataSeries.t.length; i++) {
        const t = dataSeries.t[i];
        if (t < visibleStartTimeSec || t > visibleEndTimeSec) continue;
        const dx = p.x - dataSeries.x[i];
        const dy = p.y - dataSeries.y[i];
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (isNaN(dist)) continue;
        if (closestDistance === undefined || dist < closestDistance) {
          closestDistance = dist;
          closestT = t;
        }
      }
      if (closestT === undefined) return;
      setCurrentTime(closestT);
    },
    [
      pixelToCoord,
      dataSeries,
      setCurrentTime,
      visibleStartTimeSec,
      visibleEndTimeSec,
    ],
  );

  return (
    <div style={{ position: "absolute", width, height }}>
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
          height: height - timeSelectionBarHeight,
        }}
      >
        <canvas
          style={{
            position: "absolute",
            width: canvasWidth,
            height: canvasHeight,
          }}
          ref={onCanvasElement}
          width={canvasWidth}
          height={canvasHeight}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: timeSelectionBarHeight,
          width,
          height: height - timeSelectionBarHeight,
        }}
      >
        <canvas
          style={{
            position: "absolute",
            width: canvasWidth,
            height: canvasHeight,
          }}
          ref={(elmt) => {
            elmt && setCursorCanvasElement(elmt);
          }}
          onMouseUp={handleMouseUp}
          width={canvasWidth}
          height={canvasHeight}
        />
      </div>
      {loading && !zoomInRequired && (
        <div
          style={{
            position: "absolute",
            top: timeSelectionBarHeight + margins.top,
            left: margins.left,
            userSelect: "none",
          }}
        >
          <div style={{ fontSize: 20, color: "gray" }}>Loading...</div>
        </div>
      )}
    </div>
  );
};

const findIndexForTime = (time: number, t: number[]) => {
  if (t.length === 0) return undefined;
  if (time < t[0]) return undefined;
  if (time >= t[t.length - 1]) return undefined;
  // do a binary search (assume that t is sorted)
  let a = 0;
  let b = t.length - 1;
  while (b - a > 1) {
    const c = Math.floor((a + b) / 2);
    if (time < t[c]) b = c;
    else a = c;
  }
  return a;
};

export default SpatialSeriesXYView;
