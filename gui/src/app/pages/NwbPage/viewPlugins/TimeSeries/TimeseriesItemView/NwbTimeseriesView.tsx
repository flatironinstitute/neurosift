/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import ModalWindow from "@fi-sci/modal-window";
import { QuestionMark } from "@mui/icons-material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useModalDialog } from "../../../../../ApplicationBar";
import { ToolbarItem } from "../../../../../package/ViewToolbar/Toolbars";
import TimeScrollView2, {
  useTimeScrollView2,
} from "../../../../../package/component-time-scroll-view-2/TimeScrollView2";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "../../../../../package/context-timeseries-selection";
import { useNwbFile } from "../../../NwbFileContext";
import { useDataset } from "../../../NwbMainView/NwbMainView";
import { useNwbTimeseriesDataClient } from "./NwbTimeseriesDataClient";
import TimeseriesDatasetChunkingClient from "./TimeseriesDatasetChunkingClient";
import { timeSelectionBarHeight } from "./TimeseriesSelectionBar";
import { DataSeries, Opts, SpikeTrainsDataForWorker } from "./WorkerTypes";
import { SpikeTrainsClient } from "../../Units/DirectRasterPlotUnitsItemView";
import { colorForUnitId } from "app/package/spike_sorting/unit-colors";
import { getUnitColor } from "app/package/view-units-table";

type Props = {
  width: number;
  height: number;
  objectPath: string;
  visibleChannelsRange?: [number, number];
  autoChannelSeparation?: number;
  colorChannels?: boolean;
  spikeTrainsClient?: SpikeTrainsClient;
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
  spikeTrainsClient,
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

  const dataset = useDataset(nwbFile, `${objectPath}/data`);

  const dataClient = useNwbTimeseriesDataClient(nwbFile, objectPath);
  const startTime = dataClient ? dataClient.startTime! : undefined;
  const endTime = dataClient ? dataClient.endTime! : undefined;
  useTimeseriesSelectionInitialization(startTime, endTime);

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView2({
    width,
    height: height - timeSelectionBarHeight,
    hideToolbar,
  });

  const numVisibleChannels = useMemo(
    () =>
      visibleChannelsRange
        ? visibleChannelsRange[1] - visibleChannelsRange[0]
        : dataset
          ? dataset.shape[1]
          : 0,
    [visibleChannelsRange, dataset],
  );

  const [overrideMaxVisibleDuration, setOverrideMaxVisibleDuration] = useState<
    number | undefined
  >(undefined);

  const maxVisibleDuration = useMemo(
    () =>
      overrideMaxVisibleDuration ||
      (dataClient
        ? Math.max(
            1e5 /
              (numVisibleChannels || 1) /
              (dataClient.estimatedSamplingFrequency || 1),
            0.5,
          )
        : 0),
    [numVisibleChannels, dataClient, overrideMaxVisibleDuration],
  );

  // Set chunkSize
  const chunkSize = useMemo(
    () => (dataset ? Math.floor(3e3 / (numVisibleChannels || 1)) : 0),
    [dataset, numVisibleChannels],
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
      { visibleChannelsRange, autoChannelSeparation },
    );
    setDatasetChunkingClient(client);
  }, [
    dataset,
    nwbFile,
    chunkSize,
    visibleChannelsRange,
    autoChannelSeparation,
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
      const zoomInRequired =
        visibleEndTimeSec - visibleStartTimeSec > maxVisibleDuration;
      if (zoomInRequired) {
        setStartChunkIndex(undefined);
        setEndChunkIndex(undefined);
        setZoomInRequired(true);
        return;
      }
      let iStart = await dataClient.getDataIndexForTime(visibleStartTimeSec);
      if (canceled) return;
      let iEnd = await dataClient.getDataIndexForTime(visibleEndTimeSec);
      if (canceled) return;

      // give a buffer of one point on each side
      if (iStart > 0) iStart--;
      iEnd++;

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
    numVisibleChannels,
    maxVisibleDuration,
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

  // Set dataSeries
  const [dataSeries, setDataSeries] = useState<DataSeries[] | undefined>(
    undefined,
  );
  useEffect(() => {
    setLoading(true);
    if (!datasetChunkingClient) return;
    if (dataset === undefined) return;
    if (startChunkIndex === undefined) return;
    if (endChunkIndex === undefined) return;
    if (dataClient === undefined) return;
    if (zoomInRequired) return;

    let canceler: { onCancel: (() => void)[] } | undefined = undefined;
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
            dataSeries.push({
              type: dataseriesMode,
              title: `ch${i}`,
              attributes: { color: colorForChannel(i) },
              t: Array.from(tt),
              y: concatenatedChunk[i],
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
    dataset,
    startChunkIndex,
    endChunkIndex,
    dataClient,
    zoomInRequired,
    dataseriesMode,
    colorForChannel,
  ]);

  // Set valueRange
  const [valueRange, setValueRange] = useState<
    { min: number; max: number } | undefined
  >(undefined);
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
  }, [dataSeries]);

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

  const { spikeTrainBlockStartIndex, spikeTrainBlockEndIndex } = useMemo(() => {
    if (visibleStartTimeSec === undefined)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
      };
    if (visibleEndTimeSec === undefined)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
      };
    if (!spikeTrainsClient)
      return {
        spikeTrainBlockStartIndex: undefined,
        spikeTrainBlockEndIndex: undefined,
      };
    const blockSizeSec = spikeTrainsClient.blockSizeSec;
    const spikeTrainBlockStartIndex = Math.floor(
      visibleStartTimeSec / blockSizeSec,
    );
    const spikeTrainBlockEndIndex =
      Math.ceil(visibleEndTimeSec / blockSizeSec) + 1;
    return { spikeTrainBlockStartIndex, spikeTrainBlockEndIndex };
  }, [visibleStartTimeSec, visibleEndTimeSec, spikeTrainsClient]);

  useEffect(() => {
    if (!spikeTrainsClient) return;
    if (!worker) return;
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
  ]);

  useEffect(() => {}, [spikeTrainsClient]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "m") {
      setDataseriesMode((old) => (old === "line" ? "marker" : "line"));
    }
  }, []);

  const {
    visible: helpVisible,
    handleOpen: handleOpenHelp,
    handleClose: handleCloseHelp,
  } = useModalDialog();

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

  const yLabel = useMemo(() => {
    if (!dataset) return "";
    const yLabel = dataset.attrs["unit"] || "";
    return yLabel;
  }, [dataset]);

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

  if (dataset?.dtype === "|O") {
    return <div>Unable to display timeseries dataset with dtype |O</div>;
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

export default NwbTimeseriesView;
