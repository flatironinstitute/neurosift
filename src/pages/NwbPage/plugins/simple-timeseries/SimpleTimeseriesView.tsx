import { useHdf5Group } from "@hdf5Interface";
import { FunctionComponent, useCallback, useMemo, useState } from "react";
import "../common/loadingState.css";
import { CondensedControls, Controls } from "./Controls";
import { useTimeseriesData } from "./hooks";
import LabeledEventsPlot from "./LabeledEventsPlot";
import TimeseriesPlot from "./TimeseriesPlot";
import TimeseriesPlotTSV2 from "./TimeseriesPlotTSV2";
import { Props } from "./types";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

export const SimpleTimeseriesView: FunctionComponent<
  Props & { condensed?: boolean }
> = ({ nwbUrl, path, width = 700, condensed = false }) => {
  const [usePlotly, setUsePlotly] = useState(false);

  const {
    timeseriesClient,
    error,
    isLoading,
    info,
    loadedTimestamps,
    loadedData,
    zoomInRequired,
    visibleChannelsStart,
    setVisibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  } = useTimeseriesData(nwbUrl, path);

  const group = useHdf5Group(nwbUrl, path);
  const channelNames = useMemo(() => {
    if (!group || !timeseriesClient) return undefined;
    if (group.attrs?.neurodata_type === "SpatialSeries") {
      const dimensions = ["X", "Y", "Z"];
      return dimensions.slice(0, timeseriesClient.numChannels);
    }
    return undefined;
  }, [group, timeseriesClient]);

  const [channelSeparation, setChannelSeparation] = useState<number>(0);

  const {
    zoomVisibleTimeRange,
    translateVisibleTimeRangeFrac,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = useTimeseriesSelection();
  const visibleDuration = (visibleEndTimeSec || 0) - (visibleStartTimeSec || 0);

  const handleIncreaseChannels = useCallback(() => {
    if (!timeseriesClient) return;
    const remainingChannels =
      timeseriesClient.numChannels - visibleChannelsStart;
    const nextPowerOfTwo = numVisibleChannels * 2;

    // If next power of 2 exceeds total channels, show all remaining channels
    const newNumChannels =
      nextPowerOfTwo > remainingChannels ? remainingChannels : nextPowerOfTwo;

    setNumVisibleChannels(newNumChannels);
  }, [
    timeseriesClient,
    visibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  ]);

  const handleDecreaseChannels = useCallback(() => {
    // If current count is equal to total channels, go to previous power of 2
    if (!timeseriesClient) return;
    if (numVisibleChannels === timeseriesClient.numChannels) {
      const prevPowerOfTwo = Math.pow(
        2,
        Math.floor(Math.log2(numVisibleChannels - 1)),
      );
      setNumVisibleChannels(prevPowerOfTwo);
      return;
    }

    // Otherwise divide by 2, but ensure at least 1 channel
    const newNumChannels = Math.max(1, Math.floor(numVisibleChannels / 2));
    setNumVisibleChannels(newNumChannels);
  }, [timeseriesClient, numVisibleChannels, setNumVisibleChannels]);

  const handleShiftChannelsLeft = useCallback(() => {
    const newStart = Math.max(0, visibleChannelsStart - numVisibleChannels);
    setVisibleChannelsStart(newStart);
  }, [visibleChannelsStart, numVisibleChannels, setVisibleChannelsStart]);

  const handleShiftChannelsRight = useCallback(() => {
    if (!timeseriesClient) return;
    const newStart = Math.min(
      timeseriesClient.numChannels - numVisibleChannels,
      visibleChannelsStart + numVisibleChannels,
    );
    setVisibleChannelsStart(newStart);
  }, [
    timeseriesClient,
    visibleChannelsStart,
    numVisibleChannels,
    setVisibleChannelsStart,
  ]);

  const handleIncreaseVisibleDuration = () => {
    zoomVisibleTimeRange(2);
  };

  const handleDecreaseVisibleDuration = () => {
    zoomVisibleTimeRange(0.5);
  };

  const handleShiftTimeLeft = () => {
    translateVisibleTimeRangeFrac(-0.5);
  };

  const handleShiftTimeRight = () => {
    translateVisibleTimeRangeFrac(0.5);
  };

  const handleIncreaseChannelSeparation = () => {
    setChannelSeparation((prev) => prev + 1);
  };

  const handleDecreaseChannelSeparation = () => {
    setChannelSeparation((prev) => Math.max(0, prev - 1));
  };

  if (error) {
    return (
      <div className="loadingContainer" style={{ color: "#e74c3c" }}>
        Error: {error}
      </div>
    );
  }

  if (!info) {
    return <div className="loadingContainer">Loading info...</div>;
  }

  if (!timeseriesClient) {
    return <div className="loadingContainer">Loading timeseries client...</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "absolute", top: 5, right: 5, zIndex: 1000 }}>
        <button
          onClick={() => setUsePlotly((p) => !p)}
          style={{
            padding: "4px 8px",
            backgroundColor: usePlotly ? "#007bff" : "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {usePlotly ? "Plotly" : "."}
        </button>
      </div>
      {isLoading && <div className="loadingIndicator">Loading data...</div>}
      {condensed ? (
        <CondensedControls
          info={info}
          visibleChannelsStart={visibleChannelsStart || 0}
          numVisibleChannels={numVisibleChannels}
          visibleTimeStart={visibleStartTimeSec}
          visibleDuration={visibleDuration}
          onDecreaseChannels={handleDecreaseChannels}
          onIncreaseChannels={handleIncreaseChannels}
          onShiftChannelsLeft={handleShiftChannelsLeft}
          onShiftChannelsRight={handleShiftChannelsRight}
          onDecreaseVisibleDuration={handleDecreaseVisibleDuration}
          onIncreaseVisibleDuration={handleIncreaseVisibleDuration}
          onShiftTimeLeft={handleShiftTimeLeft}
          onShiftTimeRight={handleShiftTimeRight}
          channelSeparation={channelSeparation}
          onDecreaseChannelSeparation={handleDecreaseChannelSeparation}
          onIncreaseChannelSeparation={handleIncreaseChannelSeparation}
        />
      ) : (
        <Controls
          info={info}
          visibleChannelsStart={visibleChannelsStart || 0}
          numVisibleChannels={numVisibleChannels}
          visibleTimeStart={visibleStartTimeSec}
          visibleDuration={visibleDuration}
          channelSeparation={channelSeparation}
          onDecreaseChannels={handleDecreaseChannels}
          onIncreaseChannels={handleIncreaseChannels}
          onShiftChannelsLeft={handleShiftChannelsLeft}
          onShiftChannelsRight={handleShiftChannelsRight}
          onDecreaseVisibleDuration={handleDecreaseVisibleDuration}
          onIncreaseVisibleDuration={handleIncreaseVisibleDuration}
          onShiftTimeLeft={handleShiftTimeLeft}
          onShiftTimeRight={handleShiftTimeRight}
          onDecreaseChannelSeparation={handleDecreaseChannelSeparation}
          onIncreaseChannelSeparation={handleIncreaseChannelSeparation}
        />
      )}
      {timeseriesClient.isLabeledEvents() ? (
        <LabeledEventsPlot
          timestamps={loadedTimestamps}
          data={loadedData}
          labels={timeseriesClient.getLabels()}
          visibleStartTime={visibleStartTimeSec || 0}
          visibleEndTime={visibleEndTimeSec || 0}
        />
      ) : usePlotly ? (
        <TimeseriesPlot
          timestamps={loadedTimestamps}
          data={loadedData}
          visibleStartTime={visibleStartTimeSec || 0}
          visibleEndTime={visibleEndTimeSec || 0}
          channelNames={channelNames}
          channelSeparation={channelSeparation}
          width={width}
          height={condensed ? 200 : 350}
          zoomInRequired={zoomInRequired}
        />
      ) : (
        <div
          style={{ position: "relative", width, height: condensed ? 200 : 350 }}
        >
          <TimeseriesPlotTSV2
            timestamps={loadedTimestamps}
            data={loadedData}
            visibleStartTime={visibleStartTimeSec || 0}
            visibleEndTime={visibleEndTimeSec || 0}
            channelNames={channelNames}
            channelSeparation={channelSeparation}
            width={width}
            height={condensed ? 200 : 350}
            zoomInRequired={zoomInRequired}
          />
        </div>
      )}
    </div>
  );
};
