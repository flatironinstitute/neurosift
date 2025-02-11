import { FunctionComponent, useMemo, useState } from "react";
import { Props } from "./types";
import { Controls, CondensedControls } from "./Controls";
import { useNwbGroup } from "@nwbInterface";
import { useTimeseriesData } from "./hooks";
import TimeseriesPlot from "./TimeseriesPlot";
import LabeledEventsPlot from "./LabeledEventsPlot";
import "../common/loadingState.css";

export const SimpleTimeseriesView: FunctionComponent<
  Props & { condensed?: boolean }
> = ({ nwbUrl, path, width, condensed = false }) => {
  const {
    timeseriesClient,
    error,
    isLoading,
    info,
    loadedTimestamps,
    loadedData,
    visibleTimeStart,
    setVisibleTimeStart,
    visibleDuration,
    setVisibleDuration,
    visibleChannelsStart,
    setVisibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  } = useTimeseriesData(nwbUrl, path);

  const group = useNwbGroup(nwbUrl, path);
  const channelNames = useMemo(() => {
    if (!group || !timeseriesClient) return undefined;
    if (group.attrs?.neurodata_type === "SpatialSeries") {
      const dimensions = ["X", "Y", "Z"];
      return dimensions.slice(0, timeseriesClient.numChannels);
    }
    return undefined;
  }, [group, timeseriesClient]);

  const [channelSeparation, setChannelSeparation] = useState<number>(0);

  if (error) {
    return (
      <div className="loadingContainer" style={{ color: "#e74c3c" }}>
        Error: {error}
      </div>
    );
  }

  if (!timeseriesClient || !info) {
    return <div className="loadingContainer">Loading timeseries data...</div>;
  }

  const handleIncreaseChannels = () => {
    const remainingChannels =
      timeseriesClient.numChannels - visibleChannelsStart;
    const nextPowerOfTwo = numVisibleChannels * 2;

    // If next power of 2 exceeds total channels, show all remaining channels
    const newNumChannels =
      nextPowerOfTwo > remainingChannels ? remainingChannels : nextPowerOfTwo;

    setNumVisibleChannels(newNumChannels);
  };

  const handleDecreaseChannels = () => {
    // If current count is equal to total channels, go to previous power of 2
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
  };

  const handleShiftChannelsLeft = () => {
    const newStart = Math.max(0, visibleChannelsStart - numVisibleChannels);
    setVisibleChannelsStart(newStart);
  };

  const handleShiftChannelsRight = () => {
    const newStart = Math.min(
      timeseriesClient.numChannels - numVisibleChannels,
      visibleChannelsStart + numVisibleChannels,
    );
    setVisibleChannelsStart(newStart);
  };

  const handleIncreaseVisibleDuration = () => {
    if (visibleDuration === undefined) return;
    setVisibleDuration(visibleDuration * 2);
  };

  const handleDecreaseVisibleDuration = () => {
    if (visibleDuration === undefined) return;
    setVisibleDuration(Math.max(0.1, Math.floor(visibleDuration / 2)));
  };

  const handleShiftTimeLeft = () => {
    if (!info) return;
    if (visibleTimeStart === undefined) return;
    const timeSpan = (visibleDuration || 1) / 2;
    setVisibleTimeStart(
      Math.max(info.timeseriesStartTime, visibleTimeStart - timeSpan),
    );
  };

  const handleShiftTimeRight = () => {
    if (!info) return;
    if (visibleTimeStart === undefined) return;
    const timeSpan = (visibleDuration || 1) / 2;
    const lastPossibleStart =
      info.timeseriesStartTime + info.timeseriesDuration - timeSpan;
    setVisibleTimeStart(
      Math.min(lastPossibleStart, visibleTimeStart + timeSpan),
    );
  };

  const handleIncreaseChannelSeparation = () => {
    setChannelSeparation((prev) => prev + 1);
  };

  const handleDecreaseChannelSeparation = () => {
    setChannelSeparation((prev) => Math.max(0, prev - 1));
  };

  return (
    <div style={{ position: "relative" }}>
      {isLoading && <div className="loadingIndicator">Loading data...</div>}
      {condensed ? (
        <CondensedControls
          info={info}
          visibleChannelsStart={visibleChannelsStart}
          numVisibleChannels={numVisibleChannels}
          visibleTimeStart={visibleTimeStart}
          visibleDuration={visibleDuration}
          onDecreaseChannels={handleDecreaseChannels}
          onIncreaseChannels={handleIncreaseChannels}
          onShiftChannelsLeft={handleShiftChannelsLeft}
          onShiftChannelsRight={handleShiftChannelsRight}
          onDecreaseVisibleDuration={handleDecreaseVisibleDuration}
          onIncreaseVisibleDuration={handleIncreaseVisibleDuration}
          onShiftTimeLeft={handleShiftTimeLeft}
          onShiftTimeRight={handleShiftTimeRight}
        />
      ) : (
        <Controls
          info={info}
          visibleChannelsStart={visibleChannelsStart}
          numVisibleChannels={numVisibleChannels}
          visibleTimeStart={visibleTimeStart}
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
          visibleStartTime={visibleTimeStart || 0}
          visibleEndTime={(visibleTimeStart || 0) + (visibleDuration || 1)}
        />
      ) : (
        <TimeseriesPlot
          timestamps={loadedTimestamps}
          data={loadedData}
          visibleStartTime={visibleTimeStart || 0}
          visibleEndTime={(visibleTimeStart || 0) + (visibleDuration || 1)}
          channelNames={channelNames}
          channelSeparation={channelSeparation}
          width={width}
          height={condensed ? 200 : 350}
        />
      )}
    </div>
  );
};
