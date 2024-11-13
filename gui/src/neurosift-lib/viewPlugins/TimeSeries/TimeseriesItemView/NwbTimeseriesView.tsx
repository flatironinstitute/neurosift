/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { QuestionMark } from "@mui/icons-material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ToolbarItem } from "../../../misc/ViewToolbar/Toolbars";
import TimeScrollView2, {
  useTimeScrollView2,
} from "../../../timeseries/component-time-scroll-view-2/TimeScrollView2";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "../../../contexts/context-timeseries-selection";
import { useNwbFile } from "../../../misc/NwbFileContext";
import { useDataset } from "../../../misc/hooks";
import {
  TimeseriesTimestampsClient,
  useTimeseriesTimestampsClient,
} from "./TimeseriesTimestampsClient";
import TimeseriesDatasetChunkingClient from "./TimeseriesDatasetChunkingClient";
import { timeSelectionBarHeight } from "../../../timeseries/TimeseriesSelectionBar";
import { DataSeries, Opts, SpikeTrainsDataForWorker } from "./WorkerTypes";
import { SpikeTrainsClient } from "../../Units/DirectRasterPlotUnitsItemView";
import { getUnitColor } from "../../Units/view-units-table";

type Props = {
  width: number;
  height: number;
  objectPath: string;
  visibleChannelsRange?: [number, number];
  autoChannelSeparation?: number;
  colorChannels?: boolean;
  applyConversion?: boolean;
  spikeTrainsClient?: SpikeTrainsClient;
  startZoomedOut?: boolean;
};

const gridlineOpts = {
  hideX: false,
  hideY: true,
};

const hideToolbar = false;

const NwbTimeseriesView: FunctionComponent<Props> = ({
  width,
  height,
  objectPath,
  visibleChannelsRange,
  autoChannelSeparation,
  colorChannels,
  applyConversion,
  spikeTrainsClient,
  startZoomedOut,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");
  const dataset = useDataset(nwbFile, `${objectPath}/data`);
  const numChannels = dataset ? dataset.shape[1] : 0;
  const timeseriesTimestampsClient = useTimeseriesTimestampsClient(
    nwbFile,
    objectPath,
  );
  const numVisibleChannels = useMemo(
    () =>
      visibleChannelsRange
        ? visibleChannelsRange[1] - visibleChannelsRange[0]
        : numChannels,
    [numChannels, visibleChannelsRange],
  );
  // Set the datasetChunkingClient
  const [datasetChunkingClient, setDatasetChunkingClient] = useState<
    TimeseriesDatasetChunkingClient | undefined
  >(undefined);
  const chunkSize = useMemo(
    () => (dataset ? Math.floor(3e4 / (numVisibleChannels || 1)) : 0),
    [dataset, numVisibleChannels],
  );
  useEffect(() => {
    if (!nwbFile) return;
    if (!dataset) return;
    const client = new TimeseriesDatasetChunkingClient(
      nwbFile,
      dataset,
      chunkSize,
      {
        visibleChannelsRange,
        autoChannelSeparation,
        ignoreConversion: !applyConversion,
      },
    );
    setDatasetChunkingClient(client);
  }, [
    dataset,
    nwbFile,
    chunkSize,
    visibleChannelsRange,
    autoChannelSeparation,
    applyConversion,
  ]);
  const yLabel = useMemo(() => {
    if (!dataset) return "";
    const yLabel = applyConversion ? dataset.attrs["unit"] || "" : "";
    return yLabel;
  }, [dataset, applyConversion]);

  const maxVisibleDuration = useMemo(
    () =>
      timeseriesTimestampsClient
        ? Math.max(
            8e6 /
              (numVisibleChannels || 1) /
              (timeseriesTimestampsClient.estimatedSamplingFrequency || 1),
            0.2,
          )
        : 0,
    [numVisibleChannels, timeseriesTimestampsClient],
  );

  if (dataset?.dtype === "|O") {
    return <div>Unable to display timeseries dataset with dtype |O</div>;
  }

  if (!timeseriesTimestampsClient) return <div>Loading data client...</div>;

  return (
    <NwbTimeseriesViewChild
      width={width}
      height={height}
      autoChannelSeparation={autoChannelSeparation}
      colorChannels={colorChannels}
      applyConversion={applyConversion}
      spikeTrainsClient={spikeTrainsClient}
      startZoomedOut={startZoomedOut}
      timeseriesTimestampsClient={timeseriesTimestampsClient}
      datasetChunkingClient={datasetChunkingClient!}
      numVisibleChannels={numVisibleChannels}
      yLabel={yLabel}
      maxVisibleDuration={maxVisibleDuration}
    />
  );
};

export interface DatasetChunkingClientInterface {
  chunkSize: number;
  getConcatenatedChunk: (
    startChunkIndex: number,
    endChunkIndex: number,
    canceler: { onCancel: (() => void)[] },
  ) => Promise<{ concatenatedChunk: number[][]; completed: boolean }>;
}

type NwbTimeseriesViewChildProps = {
  width: number;
  height: number;
  autoChannelSeparation?: number;
  colorChannels?: boolean;
  channelIndicesForColor?: number[];
  applyConversion?: boolean;
  spikeTrainsClient?: SpikeTrainsClient;
  startZoomedOut?: boolean;
  timeseriesTimestampsClient: TimeseriesTimestampsClient;
  datasetChunkingClient: DatasetChunkingClientInterface;
  numVisibleChannels?: number;
  yLabel: string;
  maxVisibleDuration?: number;
};

export const NwbTimeseriesViewChild: FunctionComponent<
  NwbTimeseriesViewChildProps
> = ({
  width,
  height,
  autoChannelSeparation,
  colorChannels,
  channelIndicesForColor,
  applyConversion,
  spikeTrainsClient,
  startZoomedOut,
  timeseriesTimestampsClient,
  numVisibleChannels,
  datasetChunkingClient,
  yLabel,
  maxVisibleDuration,
}) => {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [canvasElement, setCanvasElement] = useState<
    HTMLCanvasElement | undefined
  >();

  const chunkSize = datasetChunkingClient ? datasetChunkingClient.chunkSize : 0;

  const { visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } =
    useTimeRange();

  const startTime = timeseriesTimestampsClient
    ? timeseriesTimestampsClient.startTime!
    : undefined;
  const endTime = timeseriesTimestampsClient
    ? timeseriesTimestampsClient.endTime!
    : undefined;
  useTimeseriesSelectionInitialization(startTime, endTime);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - timeSelectionBarHeight,
    hideToolbar,
  });

  const [overrideMaxVisibleDuration, setOverrideMaxVisibleDuration] = useState<
    number | undefined
  >(undefined);

  // set visible time range
  useEffect(() => {
    if (!chunkSize) return;
    if (!timeseriesTimestampsClient) return;
    if (startTime === undefined) return;
    if (endTime === undefined) return;
    if (visibleStartTimeSec !== undefined) return;
    if (visibleEndTimeSec !== undefined) return;
    setVisibleTimeRange(
      startTime,
      startZoomedOut
        ? endTime
        : Math.min(
            startTime +
              (chunkSize /
                timeseriesTimestampsClient.estimatedSamplingFrequency!) *
                10,
            endTime,
          ),
    );
  }, [
    chunkSize,
    timeseriesTimestampsClient,
    setVisibleTimeRange,
    startTime,
    endTime,
    visibleStartTimeSec,
    visibleEndTimeSec,
    startZoomedOut,
  ]);

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
      visibleStartTimeSec === undefined ||
      visibleEndTimeSec === undefined ||
      !timeseriesTimestampsClient
    ) {
      setStartChunkIndex(undefined);
      setEndChunkIndex(undefined);
      setZoomInRequired(false);
      return;
    }
    let canceled = false;
    const load = async () => {
      const zoomInRequired0 =
        maxVisibleDuration !== undefined &&
        !overrideMaxVisibleDuration &&
        visibleEndTimeSec - visibleStartTimeSec > maxVisibleDuration;
      if (zoomInRequired0) {
        setStartChunkIndex(undefined);
        setEndChunkIndex(undefined);
        setZoomInRequired(true);
        return;
      }
      let iStart =
        await timeseriesTimestampsClient.getDataIndexForTime(
          visibleStartTimeSec,
        );
      if (canceled) return;
      let iEnd =
        await timeseriesTimestampsClient.getDataIndexForTime(visibleEndTimeSec);
      if (canceled) return;

      // give a buffer of one point on each side
      if (iStart > 0) iStart--;
      iEnd++;

      const startChunkIndex = Math.floor(iStart / chunkSize);
      const endChunkIndex = Math.floor(iEnd / chunkSize) + 1;
      setStartChunkIndex(startChunkIndex);
      setEndChunkIndex(endChunkIndex);
      setZoomInRequired(zoomInRequired0);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    chunkSize,
    timeseriesTimestampsClient,
    numVisibleChannels,
    maxVisibleDuration,
    overrideMaxVisibleDuration,
  ]);

  const [dataseriesMode, setDataseriesMode] = useState<"line" | "marker">(
    "line",
  );

  const [loading, setLoading] = useState<boolean>(false);

  const colorForChannel = useMemo(
    () => (i: number) => {
      if (!colorChannels) return "black";
      const colors = [
        "black",
        "darkred",
        "darkgreen",
        "darkblue",
        "darkorange",
        "purple",
        "brown",
        "pink",
      ];
      return colors[i % colors.length];
    },
    [colorChannels],
  );

  const renderSubsampleFactor = useMemo(() => {
    // estimate the render subsample factor so that we have about width pixels being rendered
    if (visibleStartTimeSec === undefined) return 1;
    if (visibleEndTimeSec === undefined) return 1;
    if (!timeseriesTimestampsClient) return 1;
    const sampleingRateHz =
      timeseriesTimestampsClient.estimatedSamplingFrequency || 1;
    const spanSec = visibleEndTimeSec - visibleStartTimeSec;
    const numSamples = spanSec * sampleingRateHz;
    const targetSubsampleFactor = Math.floor(numSamples / width);
    // we're going to subsample by a power of 2 so that it doesn't change very often
    // because we need to send new data to the worker when it changes
    const subsampleFactor = Math.pow(
      2,
      Math.floor(Math.log2(targetSubsampleFactor)),
    );
    return subsampleFactor;
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeseriesTimestampsClient,
    width,
  ]);

  // Set dataSeries
  const [dataSeries, setDataSeries] = useState<DataSeries[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (startChunkIndex === undefined) return;
    if (endChunkIndex === undefined) return;
    if (timeseriesTimestampsClient === undefined) return;
    if (zoomInRequired) return;

    setLoading(true);

    let canceler: { onCancel: (() => void)[] } | undefined = undefined;
    let canceled = false;
    const load = async () => {
      let finished = false;
      const tt = await timeseriesTimestampsClient.getTimestampsForDataIndices(
        startChunkIndex * chunkSize,
        endChunkIndex * chunkSize,
      );
      if (!tt)
        throw Error(
          `Unable to get timestamps for data indices ${startChunkIndex * chunkSize} to ${endChunkIndex * chunkSize}`,
        );
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
          const dataSeries: DataSeries[] = [];
          for (let i = 0; i < concatenatedChunk.length; i++) {
            let dataT = Array.from(tt);
            let dataY = concatenatedChunk[i];
            if (renderSubsampleFactor > 1) {
              // this will include min/max for each subsample
              dataT = subsampleT(dataT, renderSubsampleFactor);
              dataY = subsampleY(dataY, renderSubsampleFactor);
            }
            dataSeries.push({
              type: dataseriesMode,
              title: `ch${i}`,
              attributes: {
                color: colorForChannel(
                  channelIndicesForColor ? channelIndicesForColor[i] : i,
                ),
              },
              t: dataT,
              y: dataY,
            });
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
    chunkSize,
    datasetChunkingClient,
    startChunkIndex,
    endChunkIndex,
    timeseriesTimestampsClient,
    zoomInRequired,
    dataseriesMode,
    colorForChannel,
    width,
    renderSubsampleFactor,
    channelIndicesForColor,
  ]);

  // Set valueRange
  const [valueRange, setValueRange] = useState<
    { min: number; max: number } | undefined
  >(undefined);
  const [refreshValueRangeCode, setRefreshValueRangeCode] = useState<number>(0);
  useEffect(() => {
    if (!dataSeries) return;
    let min = 0;
    let max = 0;
    for (let i = 0; i < dataSeries.length; i++) {
      const y = dataSeries[i].y;
      for (let j = 0; j < y.length; j++) {
        if (!isNaN(y[j])) {
          if (y[j] < min) min = y[j];
          if (y[j] > max) max = y[j];
        }
      }
    }
    setValueRange((old) => {
      const min2 = old ? Math.min(old.min, min) : min;
      const max2 = old ? Math.max(old.max, max) : max;
      return { min: min2, max: max2 };
    });
  }, [dataSeries, refreshValueRangeCode]);
  useEffect(() => {
    // refresh the value range when applyConversion or datasetChunkingClient changes
    setValueRange(undefined);
    setDataSeries(undefined);
    setTimeout(() => {
      // not ideal
      setRefreshValueRangeCode((old) => old + 1);
    }, 100);
  }, [applyConversion, datasetChunkingClient]);

  useEffect(() => {
    // reset the value range
    setValueRange(undefined);
  }, [autoChannelSeparation]);

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
      hideLegend: true,
      legendOpts: { location: "northeast" },
      minValue: valueRange ? valueRange.min : 0,
      maxValue: valueRange ? valueRange.max : 1,
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
  ]);

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

  // Send dataseries to worker
  useEffect(() => {
    if (!worker) return;
    if (!dataSeries) return;
    worker.postMessage({
      dataSeries,
    });
  }, [worker, dataSeries]);

  const {
    spikeTrainBlockStartIndex,
    spikeTrainBlockEndIndex,
    zoomInRequiredForSpikeTrains,
  } = useMemo(() => {
    if (visibleStartTimeSec === undefined)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
        zoomInRequiredForSpikeTrains: false,
      };
    if (visibleEndTimeSec === undefined)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
        zoomInRequiredForSpikeTrains: false,
      };
    if (
      visibleEndTimeSec - visibleStartTimeSec > 60 &&
      spikeTrainsClient &&
      spikeTrainsClient.unitIds.length > 0
    ) {
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
        zoomInRequiredForSpikeTrains: true,
      };
    }
    if (!spikeTrainsClient)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
        zoomInRequiredForSpikeTrains: false,
      };
    const blockSizeSec = spikeTrainsClient.blockSizeSec;
    const spikeTrainBlockStartIndex = Math.floor(
      visibleStartTimeSec / blockSizeSec,
    );
    const spikeTrainBlockEndIndex =
      Math.ceil(visibleEndTimeSec / blockSizeSec) + 1;
    return {
      spikeTrainBlockStartIndex,
      spikeTrainBlockEndIndex,
      zoomInRequiredForSpikeTrains: false,
    };
  }, [visibleStartTimeSec, visibleEndTimeSec, spikeTrainsClient]);

  useEffect(() => {
    if (!spikeTrainsClient) return;
    if (!worker) return;
    if (zoomInRequiredForSpikeTrains) {
      worker.postMessage({
        spikeTrains: [],
      });
      return;
    }
    if (spikeTrainBlockStartIndex === undefined) return;
    if (spikeTrainBlockEndIndex === undefined) return;
    let canceled = false;
    (async () => {
      if (!spikeTrainsClient) return;
      const data = await spikeTrainsClient.getData(
        spikeTrainBlockStartIndex,
        spikeTrainBlockEndIndex,
        {},
      );
      const data2: SpikeTrainsDataForWorker = data.map((st) => ({
        unitId: st.unitId,
        spikeTimesSec: st.spikeTimesSec,
        color: getUnitColor(st.unitId),
      }));
      if (canceled) return;
      worker.postMessage({
        spikeTrains: data2,
      });
    })();
    return () => {
      canceled = true;
    };
  }, [
    spikeTrainsClient,
    spikeTrainBlockStartIndex,
    spikeTrainBlockEndIndex,
    worker,
    zoomInRequiredForSpikeTrains,
  ]);

  useEffect(() => {
    // post zoomInRequiredForSpikeTrains to worker
    if (!worker) return;
    worker.postMessage({
      zoomInRequiredForSpikeTrains,
    });
  }, [worker, zoomInRequiredForSpikeTrains]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "m") {
      setDataseriesMode((old) => (old === "line" ? "marker" : "line"));
    }
  }, []);

  const {
    visible: helpVisible,
    handleOpen: handleOpenHelp,
    handleClose: handleCloseHelp,
  } = useModalWindow();

  const additionalToolbarItems: ToolbarItem[] = useMemo(() => {
    return [
      {
        type: "button",
        callback: () => {
          handleOpenHelp();
        },
        title: "Get help",
        icon: <QuestionMark />,
      },
    ];
  }, [handleOpenHelp]);

  const yAxisInfo = useMemo(
    () => ({
      showTicks: true,
      yMin: valueRange?.min,
      yMax: valueRange?.max,
      yLabel,
    }),
    [valueRange, yLabel],
  );

  const handleKeyDown2 = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.shiftKey && e.key === "O") {
        if (
          visibleStartTimeSec !== undefined &&
          visibleEndTimeSec !== undefined
        ) {
          setOverrideMaxVisibleDuration(
            (visibleEndTimeSec - visibleStartTimeSec) * 1.2,
          );
        }
      }
    },
    [visibleStartTimeSec, visibleEndTimeSec],
  );

  if (visibleStartTimeSec === undefined) {
    return <div>visibleStartTimeSec is undefined</div>;
  }
  if (visibleEndTimeSec === undefined) {
    return <div>visibleEndTimeSec is undefined</div>;
  }
  if (startChunkIndex === undefined && !zoomInRequired) {
    return <div>Loading timestamps...</div>;
  }
  if (endChunkIndex === undefined && !zoomInRequired) {
    return <div>endChunkIndex is undefined</div>;
  }
  if (timeseriesTimestampsClient === undefined) {
    return <div>timeseriesTimestampsClient is undefined</div>;
  }

  return (
    <div
      style={{ position: "absolute", width, height }}
      onKeyDown={handleKeyDown2}
    >
      <div style={{ position: "absolute", width, height: height }}>
        <TimeScrollView2
          width={width}
          height={height}
          onCanvasElement={setCanvasElement}
          gridlineOpts={gridlineOpts}
          yAxisInfo={yAxisInfo}
          hideToolbar={hideToolbar}
          onKeyDown={handleKeyDown}
          additionalToolbarItems={additionalToolbarItems}
          showTimeSelectionBar={true}
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
          <div style={{ fontSize: 20, color: "blue" }}>Loading...</div>
        </div>
      )}
      <ModalWindow visible={helpVisible} onClose={handleCloseHelp}>
        <HelpWindow />
      </ModalWindow>
    </div>
  );
};

const HelpWindow: FunctionComponent = () => {
  return (
    <div>
      <h3>Keyboard shortcuts (click to select the plot first)</h3>
      <ul>
        <li>
          <b>m</b> - toggle between line and marker mode
        </li>
        {/* Explain that left and right arrows can be used to pan */}
        <li>
          <b>left arrow</b> - pan left
        </li>
        <li>
          <b>right arrow</b> - pan right
        </li>
        {/* Explain that mouse wheel can be used to zoom */}
        <li>
          <b>mouse wheel</b> - zoom in/out
        </li>
        {/* Explain that mouse drag can be used to pan */}
        <li>
          <b>mouse drag</b> - pan
        </li>
        {/* Explain that mouse click selects a time point */}
        <li>
          <b>mouse click</b> - select a time point
        </li>
        <li>
          <b>shift + O</b> - override the zoom restriction
        </li>
      </ul>
    </div>
  );
};

const subsampleT = (tt: number[], renderSubsampleFactor: number) => {
  if (renderSubsampleFactor <= 1) return tt;
  const y = [];
  for (let i = 0; i < tt.length; i += renderSubsampleFactor) {
    // include min/max for each subsample
    y.push(tt[i]);
    if (i < tt.length - 1) {
      y.push((tt[i] + tt[i + 1]) / 2);
    } else {
      y.push(tt[i]);
    }
  }
  return y;
};

const subsampleY = (yy: number[], renderSubsampleFactor: number) => {
  if (renderSubsampleFactor <= 1) return yy;
  const y = [];
  for (let i = 0; i < yy.length; i += renderSubsampleFactor) {
    const minVal = minIgnoringNaN(yy.slice(i, i + renderSubsampleFactor));
    const maxVal = maxIgnoringNaN(yy.slice(i, i + renderSubsampleFactor));
    y.push(minVal);
    y.push(maxVal);
  }
  return y;
};

const minIgnoringNaN = (y: number[]) => {
  let minVal = Infinity;
  for (let i = 0; i < y.length; i++) {
    if (!isNaN(y[i])) {
      minVal = Math.min(minVal, y[i]);
    }
  }
  if (minVal === Infinity) return NaN;
  return minVal;
};

const maxIgnoringNaN = (y: number[]) => {
  let maxVal = -Infinity;
  for (let i = 0; i < y.length; i++) {
    if (!isNaN(y[i])) {
      maxVal = Math.max(maxVal, y[i]);
    }
  }
  if (maxVal === -Infinity) return NaN;
  return maxVal;
};

export default NwbTimeseriesView;
