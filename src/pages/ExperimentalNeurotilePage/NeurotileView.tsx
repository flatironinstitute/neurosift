import TimeScrollView3, {
  useTimeScrollView3,
} from "@shared/component-time-scroll-view-2/TimeScrollView3";
import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import NeurotileEcephysClient, {
  Array2D,
  Array3D,
} from "./NeurotileEcephysClient";
import { renderHeatmap } from "./renderHeatmap";

type NeurotileViewProps = {
  client: NeurotileEcephysClient;
  width: number;
  height: number;
};

type ViewMode = "raw" | "spikes" | "overlay";

const NeurotileView: FunctionComponent<NeurotileViewProps> = ({
  client,
  width,
  height,
}) => {
  const { setVisibleTimeRange } = useTimeRange();
  const { setCurrentTime } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [mode, setMode] = useState<ViewMode>("raw");

  // Calculate total duration from client
  const totalDuration = client.numCoveredSamples / client.samplingFrequency;
  const startChannel = 0;
  const endChannel = client.numChannels;

  useEffect(() => {
    // Set initial visible range to full duration
    setVisibleTimeRange(0, totalDuration);
    setCurrentTime(0);
  }, [totalDuration, setVisibleTimeRange, setCurrentTime]);

  const hideToolbar = true;
  const leftMargin = 100;

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
    hideToolbar,
    leftMargin,
  });

  const {
    initializeTimeseriesSelection,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();

  useEffect(() => {
    initializeTimeseriesSelection({
      startTimeSec: 0,
      endTimeSec: totalDuration,
      initialVisibleStartTimeSec: 0,
      initialVisibleEndTimeSec: totalDuration,
    });
  }, [totalDuration, initializeTimeseriesSelection]);

  // Calculate appropriate downsampling level based on visible time range
  const calculateDownsamplingLevel = useCallback(
    (startTime: number, endTime: number) => {
      const visibleDuration = endTime - startTime;
      const visibleSamples = visibleDuration * client.samplingFrequency;
      const targetSamples = Math.min(width, 1000); // Target at least width time samples for visualization

      // Find the highest downsampling level that gives us at least targetSamples
      let downsamplingLevel = 0;
      for (let level = 0; level < client.numDownsamplingLevels; level++) {
        const downsamplingFactor = Math.pow(client.downsamplingBase, level);
        const downsampledSamples = visibleSamples / downsamplingFactor;
        if (downsampledSamples >= targetSamples) {
          downsamplingLevel = level;
        } else {
          break;
        }
      }
      return downsamplingLevel;
    },
    [client, width],
  );

  const renderLoopData = useRef<{
    visibleStartTimeSec?: number;
    visibleEndTimeSec?: number;
    startChannel: number;
    endChannel: number;
    calculateDownsamplingLevel: (startTime: number, endTime: number) => number;
    canvasHeight: number;
    canvasWidth: number;
    client: NeurotileEcephysClient;
    context: CanvasRenderingContext2D | null;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    mode: ViewMode;
  } | null>(null);
  useEffect(() => {
    renderLoopData.current = {
      visibleStartTimeSec,
      visibleEndTimeSec,
      startChannel,
      endChannel,
      calculateDownsamplingLevel,
      canvasHeight,
      canvasWidth,
      client,
      context,
      margins,
      mode,
    };
  }, [
    visibleStartTimeSec,
    visibleEndTimeSec,
    startChannel,
    endChannel,
    calculateDownsamplingLevel,
    canvasHeight,
    canvasWidth,
    client,
    context,
    margins,
    mode,
  ]);

  useEffect(() => {
    // only one of these
    let canceled = false;
    const renderLoop = async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let previousRenderLoopData: any = null;
      while (true) {
        if (canceled) return;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const currentRenderLoopData = renderLoopData.current;
        if (
          previousRenderLoopData !== currentRenderLoopData &&
          currentRenderLoopData !== null
        ) {
          const timer = Date.now();
          console.info("=======");
          await renderStep(currentRenderLoopData);
          const elapsed = Date.now() - timer;
          console.info(`Render step took ${elapsed} ms`);
          previousRenderLoopData = currentRenderLoopData;
        }
      }
    };
    const renderStep = async (renderLoopData: {
      visibleStartTimeSec?: number;
      visibleEndTimeSec?: number;
      startChannel: number;
      endChannel: number;
      calculateDownsamplingLevel: (
        startTime: number,
        endTime: number,
      ) => number;
      canvasHeight: number;
      canvasWidth: number;
      client: NeurotileEcephysClient;
      context: CanvasRenderingContext2D | null;
      margins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
      mode: ViewMode;
    }) => {
      const {
        visibleStartTimeSec,
        visibleEndTimeSec,
        startChannel,
        endChannel,
        calculateDownsamplingLevel,
        canvasHeight,
        canvasWidth,
        client,
        context,
        margins,
        mode,
      } = renderLoopData;
      if (
        visibleStartTimeSec === undefined ||
        visibleEndTimeSec === undefined
      ) {
        return;
      }
      if (!context) {
        return;
      }

      const startTime = visibleStartTimeSec;
      const endTime = visibleEndTimeSec;

      const downsamplingLevel = calculateDownsamplingLevel(startTime, endTime);
      const downsamplingFactor = Math.pow(
        client.downsamplingBase,
        downsamplingLevel,
      );

      const startSample = Math.floor(
        (startTime * client.samplingFrequency) / downsamplingFactor,
      );
      const endSample = Math.ceil(
        (endTime * client.samplingFrequency) / downsamplingFactor,
      );

      // Convert to appropriate array format
      const numSamples = endSample - startSample;
      const numChannels = endChannel - startChannel;
      let data: Int16Array;
      let spikesData: Int16Array | null = null;

      if (mode === "overlay") {
        // For overlay mode, load both datasets
        const [rawArrayData, spikesArrayData] = await Promise.all([
          client.loadData({
            startChannel,
            endChannel,
            downsamplingLevel,
            startSample,
            endSample,
            datasetName: "data",
          }),
          client.loadData({
            startChannel,
            endChannel,
            downsamplingLevel,
            startSample,
            endSample,
            datasetName: "spike_counts",
          }),
        ]);

        // Process raw data
        const dataLength = numSamples * numChannels * 2;
        data = new Int16Array(dataLength);

        for (let t = 0; t < numSamples; t++) {
          for (let c = 0; c < numChannels; c++) {
            let value: [number, number];
            if (downsamplingLevel === 0) {
              // Raw data - arrayData is Array2D
              const min0 = (rawArrayData as Array2D).get(t, c);
              value = [min0, min0];
            } else {
              // Use max value from min/max pair for visualization - arrayData is Array3D
              const min0 = (rawArrayData as Array3D).get(t, 0, c);
              const max0 = (rawArrayData as Array3D).get(t, 1, c);
              value = [min0, max0];
            }
            data[t * numChannels * 2 + c * 2] = value[0];
            data[t * numChannels * 2 + c * 2 + 1] = value[1];
          }
        }

        // Process spikes data
        const spikesDataLength = numSamples * numChannels;
        spikesData = new Int16Array(spikesDataLength);

        for (let t = 0; t < numSamples; t++) {
          for (let c = 0; c < numChannels; c++) {
            const spikeCount = (spikesArrayData as Array2D).get(t, c);
            spikesData[t * numChannels + c] = spikeCount;
          }
        }
      } else {
        // For single mode, load appropriate dataset
        const datasetName = mode === "spikes" ? "spike_counts" : "data";
        const arrayData = await client.loadData({
          startChannel,
          endChannel,
          downsamplingLevel,
          startSample,
          endSample,
          datasetName,
        });

        if (mode === "spikes") {
          // For spikes mode, data is single values (no min/max pairs)
          const dataLength = numSamples * numChannels;
          data = new Int16Array(dataLength);

          for (let t = 0; t < numSamples; t++) {
            for (let c = 0; c < numChannels; c++) {
              const spikeCount = (arrayData as Array2D).get(t, c);
              data[t * numChannels + c] = spikeCount;
            }
          }
        } else {
          // For raw mode, data has min/max pairs
          const dataLength = numSamples * numChannels * 2;
          data = new Int16Array(dataLength);

          for (let t = 0; t < numSamples; t++) {
            for (let c = 0; c < numChannels; c++) {
              let value: [number, number];
              if (downsamplingLevel === 0) {
                // Raw data - arrayData is Array2D
                const min0 = (arrayData as Array2D).get(t, c);
                value = [min0, min0];
              } else {
                // Use max value from min/max pair for visualization
                const min0 = (arrayData as Array3D).get(t, 0, c);
                const max0 = (arrayData as Array3D).get(t, 1, c);
                value = [min0, max0];
              }
              data[t * numChannels * 2 + c * 2] = value[0];
              data[t * numChannels * 2 + c * 2 + 1] = value[1];
            }
          }
        }
      }

      const ntData = {
        numChannels,
        numSamples,
        data,
        spikesData,
        startTimeSec: startTime,
        endTimeSec: endTime,
        startChannel,
        endChannel,
        downsamplingLevel,
        mode,
      };
      // setNeurotileData(ntData);
      await renderHeatmap({
        context,
        neurotileData: ntData,
        width: canvasWidth,
        height: canvasHeight,
        margins,
        cancelHandle: { canceled: false },
      });
    };
    renderLoop();
    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div style={{ width, height, position: "relative" }}>
      {/* Mode toggle button */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "4px",
        }}
      >
        <button
          onClick={() => {
            if (mode === "raw") setMode("spikes");
            else if (mode === "spikes") setMode("overlay");
            else setMode("raw");
          }}
          style={{
            padding: "6px 12px",
            border: "none",
            borderRadius: "3px",
            backgroundColor:
              mode === "raw"
                ? "#007bff"
                : mode === "spikes"
                  ? "#28a745"
                  : "#dc3545",
            color: "white",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
        >
          {mode === "raw" ? "Raw" : mode === "spikes" ? "Spikes" : "Overlay"}
        </button>
      </div>

      <TimeScrollView3
        width={width}
        height={height}
        onCanvasElement={(canvas) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          setContext(ctx);
        }}
        hideToolbar={hideToolbar}
        leftMargin={leftMargin}
        yAxisInfo={{
          showTicks: true,
          yMin: startChannel,
          yMax: endChannel - 1,
          yLabel: "Channel",
        }}
      />
    </div>
  );
};

export default NeurotileView;
