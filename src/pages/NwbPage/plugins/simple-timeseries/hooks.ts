import { useState, useEffect, useCallback, useRef } from "react";
import { useNwbGroup } from "@nwbInterface";
import TimeseriesClient from "./TimeseriesClient";
import { SimpleTimeseriesInfo } from "./types";
import {
  useTimeRange,
  useTimeseriesSelectionInitialization,
} from "@shared/context-timeseries-selection";

export const useTimeseriesData = (nwbUrl: string, path: string) => {
  const [timeseriesClient, setTimeseriesClient] = useState<TimeseriesClient>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [info, setInfo] = useState<SimpleTimeseriesInfo>();

  const group = useNwbGroup(nwbUrl, path);

  // Initialize timeseries client
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

  //   const [visibleDuration, setVisibleDuration] = useState(10);
  //   const [visibleTimeStart, setVisibleTimeStart] = useState(0);
  const { visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } =
    useTimeRange();
  const visibleDuration = (visibleEndTimeSec || 0) - (visibleStartTimeSec || 0);
  const visibleTimeStart = visibleStartTimeSec || 0;
  const setVisibleDuration = useCallback(
    (duration: number) => {
      setVisibleTimeRange(visibleTimeStart, (visibleTimeStart || 0) + duration);
    },
    [visibleTimeStart, setVisibleTimeRange],
  );
  const setVisibleTimeStart = useCallback(
    (time: number) => {
      setVisibleTimeRange(
        time,
        (time || 0) + (visibleEndTimeSec || 0) - (visibleStartTimeSec || 0),
      );
    },
    [visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange],
  );

  const [timeseriesStartTime, setTimeseriesStartTime] = useState<number>();
  const [timeseriesDuration, setTimeseriesDuration] = useState<number>();
  useEffect(() => {
    if (!timeseriesClient) return;
    timeseriesClient.startTime().then((t) => {
      setTimeseriesStartTime(t);
    });
    timeseriesClient.duration().then((d) => {
      setTimeseriesDuration(d);
    });
  }, [timeseriesClient]);

  useTimeseriesSelectionInitialization(
    timeseriesStartTime !== undefined && timeseriesDuration !== undefined
      ? timeseriesStartTime
      : 0,
    timeseriesStartTime !== undefined && timeseriesDuration !== undefined
      ? timeseriesStartTime + timeseriesDuration
      : 0,
  );

  // Initialize visible time start
  const didInitializeVisibleTimeStart = useRef(false);
  useEffect(() => {
    if (!timeseriesClient) return;
    if (timeseriesStartTime === undefined) return;
    if (timeseriesDuration === undefined) return;
    if (didInitializeVisibleTimeStart.current) return;
    timeseriesClient.startTime().then((t) => {
      setVisibleTimeStart(t);
      didInitializeVisibleTimeStart.current = true;
    });
  }, [
    timeseriesClient,
    setVisibleTimeStart,
    timeseriesStartTime,
    timeseriesDuration,
  ]);

  // Initialize visible duration based on sampling frequency
  const didInitializeVisibleDuration = useRef(false);
  useEffect(() => {
    if (!timeseriesClient) return;
    if (timeseriesStartTime === undefined) return;
    if (timeseriesDuration === undefined) return;
    if (didInitializeVisibleDuration.current) return;
    timeseriesClient.samplingFrequency().then((freq) => {
      setVisibleDuration(500 / freq);
      didInitializeVisibleDuration.current = true;
    });
  }, [
    timeseriesClient,
    setVisibleDuration,
    timeseriesStartTime,
    timeseriesDuration,
  ]);

  // Initialize channel view state
  const [visibleChannelsStart, setVisibleChannelsStart] = useState(0);
  const [numVisibleChannels, setNumVisibleChannels] = useState(1);

  // Load data when view parameters change
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

  return {
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
  };
};
