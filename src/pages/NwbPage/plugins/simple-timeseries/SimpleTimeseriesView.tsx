import { FunctionComponent, useEffect, useState } from "react";
import { useNwbGroup } from "../../nwbInterface";
import TimeseriesClient from "./TimeseriesClient";
import TimeseriesPlot from "./TimeseriesPlot";
import LabeledEventsPlot from "./LabeledEventsPlot";
import "../common/loadingState.css";

const formatSamplingFrequency = (freq: number): string => {
  if (freq >= 1000) {
    return `${(freq / 1000).toFixed(2)} kHz`;
  }
  return `${freq.toFixed(2)} Hz`;
};

type Props = {
  nwbUrl: string;
  path: string;
};

export const SimpleTimeseriesView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
}) => {
  const [timeseriesClient, setTimeseriesClient] = useState<TimeseriesClient>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const group = useNwbGroup(nwbUrl, path);

  useEffect(() => {
    if (!group) return;
    TimeseriesClient.create(nwbUrl, group)
      .then((client) => {
        setTimeseriesClient(client);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [nwbUrl, group]);

  const [visibleChannelsStart, setVisibleChannelsStart] = useState(0);
  const [numVisibleChannels, setNumVisibleChannels] = useState(1);
  const [visibleTimeStart, setVisibleTimeStart] = useState(0);
  const [visibleDuration, setVisibleDuration] = useState(10);

  // determine visible duration to hold an estimated 500 samples based on estimated sampling frequency
  useEffect(() => {
    if (!timeseriesClient) return;
    timeseriesClient.samplingFrequency().then((freq) => {
      setVisibleDuration(500 / freq);
    });
  }, [timeseriesClient]);

  useEffect(() => {
    if (!timeseriesClient) return;
    timeseriesClient.startTime().then((t) => {
      setVisibleTimeStart(t);
    });
  }, [timeseriesClient]);

  const [info, setInfo] = useState<
    | {
        visibleTimestamps: number[];
        visibleDuration: number;
        visibleData: number[][];
        startTimestamp: number;
        totalNumSamples: number;
        totalNumChannels: number;
        samplingFrequency: number;
        timeseriesStartTime: number;
        timeseriesDuration: number;
      }
    | undefined
  >(undefined);

  const handleIncreaseChannels = () => {
    if (!timeseriesClient) return;
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

  const handleShiftLeft = () => {
    if (!timeseriesClient) return;
    const newStart = Math.max(0, visibleChannelsStart - numVisibleChannels);
    setVisibleChannelsStart(newStart);
  };

  const handleShiftRight = () => {
    if (!timeseriesClient) return;
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
    if (!info || !timeseriesClient) return;
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
  useEffect(() => {
    if (!timeseriesClient) return;
    setIsLoading(true);
    const load = async () => {
      const tStart = visibleTimeStart;
      const samplingFrequency = await timeseriesClient.samplingFrequency();
      const numSamples = timeseriesClient.numSamples;
      const visibleChannelsEnd = Math.min(
        visibleChannelsStart + numVisibleChannels,
        timeseriesClient.numChannels,
      );
      const [startTime, duration, dataResult] = await Promise.all([
        timeseriesClient.startTime(),
        timeseriesClient.duration(),
        timeseriesClient.getDataForTimeRange(
          tStart,
          tStart + visibleDuration,
          visibleChannelsStart,
          visibleChannelsEnd,
        ),
      ]);

      const { data, timestamps } = dataResult;

      // Reshape the flat array into 2D array [timepoints][channels]
      const numTimepoints = timestamps.length;
      const numChannels = visibleChannelsEnd - visibleChannelsStart;
      const reshapedData = Array(numTimepoints)
        .fill(0)
        .map((_, i) => data.slice(i * numChannels, (i + 1) * numChannels));

      setInfo({
        visibleTimestamps: timestamps,
        visibleDuration: visibleDuration,
        visibleData: reshapedData,
        startTimestamp: tStart,
        totalNumSamples: numSamples,
        totalNumChannels: timeseriesClient.numChannels,
        samplingFrequency: samplingFrequency,
        timeseriesStartTime: startTime,
        timeseriesDuration: duration,
      });
      setIsLoading(false);
    };
    load().catch((err) => {
      setError(err.message);
      setIsLoading(false);
    });
  }, [
    numVisibleChannels,
    visibleChannelsStart,
    visibleTimeStart,
    visibleDuration,
    timeseriesClient,
  ]);

  if (error)
    return (
      <div className="loadingContainer" style={{ color: "#e74c3c" }}>
        Error: {error}
      </div>
    );

  if (!timeseriesClient || !info)
    return <div className="loadingContainer">Loading timeseries data...</div>;

  return (
    <div style={{ position: "relative" }}>
      {isLoading && <div className="loadingIndicator">Loading data...</div>}
      <div
        style={{
          padding: "10px",
          marginBottom: "15px",
          background: "#f5f5f5",
          borderRadius: "5px",
          fontFamily: "sans-serif",
          fontSize: "0.9rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "4px 12px",
            alignItems: "baseline",
          }}
        >
          <div style={{ fontWeight: "bold" }}>Recording:</div>
          <div>
            Start: {info.timeseriesStartTime.toFixed(2)} s, Duration:{" "}
            {info.timeseriesDuration.toFixed(2)} s
          </div>

          <div style={{ fontWeight: "bold" }}>Sampling frequency:</div>
          <div>{formatSamplingFrequency(info.samplingFrequency)}</div>

          <div style={{ fontWeight: "bold" }}>Channels:</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {visibleChannelsStart} -{" "}
              {Math.min(
                visibleChannelsStart + numVisibleChannels,
                info.totalNumChannels,
              ) - 1}{" "}
              of {info.totalNumChannels}
            </span>
            <button
              onClick={handleDecreaseChannels}
              disabled={numVisibleChannels <= 1}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: numVisibleChannels <= 1 ? "#f5f5f5" : "white",
                cursor: numVisibleChannels <= 1 ? "default" : "pointer",
              }}
            >
              /2
            </button>
            <button
              onClick={handleIncreaseChannels}
              disabled={
                visibleChannelsStart + numVisibleChannels * 2 >
                info.totalNumChannels
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleChannelsStart + numVisibleChannels * 2 >
                  info.totalNumChannels
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  visibleChannelsStart + numVisibleChannels * 2 >
                  info.totalNumChannels
                    ? "default"
                    : "pointer",
              }}
            >
              ×2
            </button>
            <button
              onClick={handleShiftLeft}
              disabled={visibleChannelsStart === 0}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleChannelsStart === 0 ? "#f5f5f5" : "white",
                cursor: visibleChannelsStart === 0 ? "default" : "pointer",
              }}
            >
              ←
            </button>
            <button
              onClick={handleShiftRight}
              disabled={
                visibleChannelsStart + numVisibleChannels >=
                info.totalNumChannels
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  visibleChannelsStart + numVisibleChannels >=
                  info.totalNumChannels
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  visibleChannelsStart + numVisibleChannels >=
                  info.totalNumChannels
                    ? "default"
                    : "pointer",
              }}
            >
              →
            </button>
          </div>

          <div style={{ fontWeight: "bold" }}>Samples:</div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {info.visibleDuration.toFixed(2)} sec starting at{" "}
              {info.startTimestamp.toFixed(2)} s
            </span>
            <button
              onClick={handleDecreaseVisibleDuration}
              disabled={visibleDuration <= 0.2}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: visibleDuration <= 0.2 ? "#f5f5f5" : "white",
                cursor: visibleDuration <= 0.2 ? "default" : "pointer",
              }}
            >
              /2
            </button>
            <button
              onClick={handleIncreaseVisibleDuration}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              ×2
            </button>
            <button
              onClick={handleShiftTimeLeft}
              disabled={visibleTimeStart <= 0}
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor: visibleTimeStart <= 0 ? "#f5f5f5" : "white",
                cursor: visibleTimeStart <= 0 ? "default" : "pointer",
              }}
            >
              ←
            </button>
            <button
              onClick={handleShiftTimeRight}
              disabled={
                !info ||
                visibleTimeStart >=
                  info.totalNumSamples / info.samplingFrequency -
                    (info.visibleTimestamps[info.visibleTimestamps.length - 1] -
                      info.visibleTimestamps[0])
              }
              style={{
                padding: "2px 6px",
                border: "1px solid #ccc",
                borderRadius: "2px",
                fontSize: "0.85rem",
                backgroundColor:
                  !info ||
                  visibleTimeStart >=
                    info.totalNumSamples / info.samplingFrequency -
                      (info.visibleTimestamps[
                        info.visibleTimestamps.length - 1
                      ] -
                        info.visibleTimestamps[0])
                    ? "#f5f5f5"
                    : "white",
                cursor:
                  !info ||
                  visibleTimeStart >=
                    info.totalNumSamples / info.samplingFrequency -
                      (info.visibleTimestamps[
                        info.visibleTimestamps.length - 1
                      ] -
                        info.visibleTimestamps[0])
                    ? "default"
                    : "pointer",
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>
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
        />
      )}
    </div>
  );
};
