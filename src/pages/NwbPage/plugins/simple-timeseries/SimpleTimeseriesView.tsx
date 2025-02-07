import { FunctionComponent, useState } from "react";
import { Props } from "./types";
import { Controls } from "./Controls";
import { useTimeseriesData } from "./hooks";
import TimeseriesPlot from "./TimeseriesPlot";
import LabeledEventsPlot from "./LabeledEventsPlot";
import "../common/loadingState.css";

export const SimpleTimeseriesView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width,
}) => {
  const {
    timeseriesClient,
    error,
    isLoading,
    info,
    visibleTimeStart,
    setVisibleTimeStart,
    visibleDuration,
    setVisibleDuration,
    visibleChannelsStart,
    setVisibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  } = useTimeseriesData(nwbUrl, path);

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
    const newNumChannels = Math.min(
      numVisibleChannels * 2,
      timeseriesClient.numChannels - visibleChannelsStart,
    );
    setNumVisibleChannels(newNumChannels);
  };

  const handleDecreaseChannels = () => {
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
    setVisibleDuration(visibleDuration * 2);
  };

  const handleDecreaseVisibleDuration = () => {
    setVisibleDuration(Math.max(0.1, Math.floor(visibleDuration / 2)));
  };

  const handleShiftTimeLeft = () => {
    if (!info) return;
    const timeSpan =
      (info.visibleTimestamps[info.visibleTimestamps.length - 1] -
        info.visibleTimestamps[0]) /
      2;
    setVisibleTimeStart(Math.max(0, visibleTimeStart - timeSpan));
  };

  const handleShiftTimeRight = () => {
    if (!info) return;
    const timeSpan =
      (info.visibleTimestamps[info.visibleTimestamps.length - 1] -
        info.visibleTimestamps[0]) /
      2;
    const lastPossibleStart =
      info.totalNumSamples / info.samplingFrequency - timeSpan * 2;
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
      {timeseriesClient.isLabeledEvents() ? (
        <LabeledEventsPlot
          timestamps={info.visibleTimestamps}
          data={info.visibleData}
          labels={timeseriesClient.getLabels()}
        />
      ) : (
        <TimeseriesPlot
          timestamps={info.visibleTimestamps}
          data={info.visibleData}
          channelSeparation={channelSeparation}
          width={width}
        />
      )}
    </div>
  );
};
