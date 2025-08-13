import { CustomToolbarAction } from "@shared/component-time-scroll-view-2/TimeScrollToolbar";
import TimeScrollView3 from "@shared/component-time-scroll-view-2/TimeScrollView3";
import { useTimeScrollView3 } from "@shared/component-time-scroll-view-2/useTimeScrollView3";
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
import NTEcephysClient, { Array2D, Array3D } from "./NTEcephysClient";
import { renderHeatmap } from "./renderHeatmap";
import { useNeurosiftJobById } from "@jobManager/useNeurosiftJob";
import { getUnitColor } from "@shared/context-unit-selection/unitColors";
import { idToNum } from "@shared/context-unit-selection";

type NTEcephysRawViewProps = {
  client: NTEcephysClient;
  width: number;
  height: number;
  spikeSortingJobId?: string;
};

type ViewMode = "raw" | "spikes" | "overlay";

type SpikeSortingOutput = {
  units: {
    id: string;
    spike_train: number[];
  }[];
};

const NTEcephysRawView: FunctionComponent<NTEcephysRawViewProps> = ({
  client,
  width,
  height,
  spikeSortingJobId,
}) => {
  const { setVisibleTimeRange } = useTimeRange();
  const { setCurrentTime } = useTimeseriesSelection();

  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [mode, setMode] = useState<ViewMode>("raw");
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);

  // Calculate total duration from client
  const totalDuration = client.numCoveredSamples / client.samplingFrequency;
  const startChannel = 0;
  const endChannel = client.numChannels;

  const { job: spikeSortingJob } = useNeurosiftJobById(spikeSortingJobId);
  const spikeSortingOutputUrl: string | undefined = spikeSortingJob?.output
    ? JSON.parse(spikeSortingJob.output).output_url
    : undefined;
  const { data: spikeSortingOutput } = useJsonFromUrl<SpikeSortingOutput>(
    spikeSortingOutputUrl,
  );

  useEffect(() => {
    // Set initial visible range to full duration
    setVisibleTimeRange(0, totalDuration);
    setCurrentTime(0);
  }, [totalDuration, setVisibleTimeRange, setCurrentTime]);

  const leftMargin = 100;

  const { canvasWidth, canvasHeight, margins } = useTimeScrollView3({
    width,
    height,
    leftMargin,
    hasCustomActions: true, // NTView always has custom actions
  });

  // Function to convert pixel Y coordinate to channel number
  const pixelToChannel = useCallback(
    (pixelY: number) => {
      const plotHeight = canvasHeight - margins.top - margins.bottom;
      const relativeY = pixelY - margins.top;
      const normalizedY = 1 - relativeY / plotHeight; // Flip Y axis
      const channel = startChannel + normalizedY * (endChannel - startChannel);
      return Math.round(
        Math.max(startChannel, Math.min(endChannel - 1, channel)),
      );
    },
    [canvasHeight, margins, startChannel, endChannel],
  );

  // Handle canvas clicks to set selected channel
  const handleCanvasClick = useCallback(
    (_x: number, y: number) => {
      const channel = pixelToChannel(y);
      setSelectedChannel(channel);
    },
    [pixelToChannel],
  );

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
    client: NTEcephysClient;
    context: CanvasRenderingContext2D | null;
    margins: {
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    mode: ViewMode;
    selectedChannel: number | null;
    spikeSortingOutput?: SpikeSortingOutput;
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
      selectedChannel,
      spikeSortingOutput,
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
    selectedChannel,
    spikeSortingOutput,
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
      client: NTEcephysClient;
      context: CanvasRenderingContext2D | null;
      margins: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
      mode: ViewMode;
      selectedChannel: number | null;
      spikeSortingOutput?: SpikeSortingOutput;
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
        selectedChannel,
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
      // setNTData(ntData);
      await renderHeatmap({
        context,
        ntData: ntData,
        width: canvasWidth,
        height: canvasHeight,
        margins,
        cancelHandle: { canceled: false },
      });

      // Draw selected channel line if there is one
      if (selectedChannel !== null && selectedChannel !== undefined) {
        const channelIndex = selectedChannel - startChannel;
        if (channelIndex >= 0 && channelIndex < numChannels) {
          const plotWidth = canvasWidth - margins.left - margins.right;
          const plotHeight = canvasHeight - margins.top - margins.bottom;
          const channelY =
            margins.top +
            ((numChannels - 1 - channelIndex) * plotHeight) / numChannels;
          const channelHeight = plotHeight / numChannels;

          // Draw a very subtle semitransparent highlight across the selected channel
          context.fillStyle = "rgba(255, 255, 0, 0.1)";
          context.fillRect(
            margins.left,
            channelY - channelHeight / 2,
            plotWidth,
            channelHeight,
          );

          // Draw a subtle border line
          context.strokeStyle = "rgba(255, 255, 0, 0.3)";
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(margins.left, channelY);
          context.lineTo(margins.left + plotWidth, channelY);
          context.stroke();
        }
      }

      if (spikeSortingOutput) {
        for (const unit of spikeSortingOutput.units) {
          const spikeTrain = unit.spike_train;
          if (spikeTrain.length === 0) continue;
          for (const sample of spikeTrain) {
            const t = sample / client.samplingFrequency;
            if (visibleStartTimeSec <= t && t <= visibleEndTimeSec) {
              const frac =
                (t - visibleStartTimeSec) /
                (visibleEndTimeSec - visibleStartTimeSec);
              const x =
                margins.left +
                frac * (canvasWidth - margins.left - margins.right);
              // vertical line at x
              context.strokeStyle = getUnitColor(idToNum(unit.id));
              context.lineWidth = 1;
              context.beginPath();
              context.moveTo(x, margins.top);
              context.lineTo(x, canvasHeight - margins.bottom);
              context.stroke();
            }
          }
        }
      }
    };
    renderLoop();
    return () => {
      canceled = true;
    };
  }, []);

  // Create custom toolbar actions for mode switching and channel display
  const customToolbarActions: CustomToolbarAction[] = [
    {
      id: "selected-channel",
      label:
        selectedChannel !== null
          ? `Channel: ${selectedChannel}`
          : "No channel selected",
      isActive: false,
      tooltip: "Currently selected channel",
    },
    {
      id: "mode-raw",
      label: "Raw",
      icon: "📊",
      onClick: () => setMode("raw"),
      isActive: mode === "raw",
      tooltip: "Show raw electrophysiology data",
    },
    {
      id: "mode-spikes",
      label: "Spikes",
      icon: "⚡",
      onClick: () => setMode("spikes"),
      isActive: mode === "spikes",
      tooltip: "Show spike count data",
    },
    {
      id: "mode-overlay",
      label: "Overlay",
      icon: "🔀",
      onClick: () => setMode("overlay"),
      isActive: mode === "overlay",
      tooltip: "Show overlay of raw and spike data",
    },
  ];

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden" }}>
      <TimeScrollView3
        width={width - 10}
        height={height}
        onCanvasElement={(canvas) => {
          if (!canvas) return;
          const ctx = canvas.getContext("2d");
          setContext(ctx);
        }}
        leftMargin={leftMargin}
        yAxisInfo={{
          showTicks: true,
          yMin: startChannel,
          yMax: endChannel - 1,
          yLabel: "Channel",
        }}
        customToolbarActions={customToolbarActions}
        onCanvasClick={handleCanvasClick}
      />
    </div>
  );
};

const useJsonFromUrl = <T,>(url: string | undefined) => {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!url) return;

    setIsLoading(true);
    setError(null);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch JSON: ${response.statusText}`);
        }
        return response.json();
      })
      .then((jsonData) => {
        setData(jsonData);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Unknown error");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [url]);

  return { data, error, isLoading };
};

export default NTEcephysRawView;
