import { useNwbGroup } from "@nwbInterface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { useCallback, useEffect, useRef, useState } from "react";
import TimeseriesClient from "./TimeseriesClient";
import { SimpleTimeseriesInfo } from "./types";

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

  const {
    initializeTimeseriesSelection,
    startTimeSec,
    endTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
    setVisibleTimeRange,
  } = useTimeseriesSelection();
  useEffect(() => {
    if (!timeseriesClient) return;
    const initialize = async () => {
      const startTime = await timeseriesClient.startTime();
      const endTime = await timeseriesClient.endTime();
      initializeTimeseriesSelection(startTime, endTime);
    };
    initialize();
  }, [timeseriesClient, initializeTimeseriesSelection]);

  const setVisibleDuration = useCallback(
    (duration: number) => {
      if (
        visibleStartTimeSec === undefined ||
        visibleEndTimeSec === undefined
      ) {
        if (startTimeSec === undefined || endTimeSec === undefined) return;
        setVisibleTimeRange(startTimeSec, startTimeSec + duration);
      } else {
        setVisibleTimeRange(
          visibleStartTimeSec,
          visibleStartTimeSec + duration,
        );
      }
    },
    [
      visibleStartTimeSec,
      visibleEndTimeSec,
      setVisibleTimeRange,
      startTimeSec,
      endTimeSec,
    ],
  );
  const setVisibleTimeStart = useCallback(
    (time: number) => {
      if (
        visibleStartTimeSec !== undefined &&
        visibleEndTimeSec !== undefined
      ) {
        setVisibleTimeRange(
          time,
          time + (visibleEndTimeSec - visibleStartTimeSec),
        );
      }
    },
    [visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange],
  );

  // Initialize visible duration based on sampling frequency
  const didInitializeVisibleDuration = useRef(false);
  useEffect(() => {
    if (!timeseriesClient) return;
    if (startTimeSec === undefined) return;
    if (endTimeSec === undefined) return;
    if (didInitializeVisibleDuration.current) return;
    timeseriesClient.samplingFrequency().then((freq) => {
      setVisibleDuration(500 / freq);
      didInitializeVisibleDuration.current = true;
    });
  }, [timeseriesClient, startTimeSec, endTimeSec, setVisibleDuration]);

  // Initialize channel view state
  const [visibleChannelsStart, setVisibleChannelsStart] = useState(0);
  const [numVisibleChannels, setNumVisibleChannels] = useState(1);

  // Load data when view parameters change
  useEffect(() => {
    if (!timeseriesClient) return;
    setIsLoading(true);
    const load = async () => {
      const tStart =
        visibleStartTimeSec !== undefined ? visibleStartTimeSec : startTimeSec;
      if (tStart === undefined) return;
      const visibleDuration =
        visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
          ? visibleEndTimeSec - visibleStartTimeSec
          : undefined;
      if (visibleDuration === undefined) return;
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
    timeseriesClient,
    visibleStartTimeSec,
    visibleEndTimeSec,
    visibleChannelsStart,
    numVisibleChannels,
    startTimeSec,
  ]);
  return {
    timeseriesClient,
    error,
    isLoading,
    info,
    visibleTimeStart: visibleStartTimeSec,
    setVisibleTimeStart,
    visibleDuration:
      visibleEndTimeSec !== undefined && visibleStartTimeSec !== undefined
        ? visibleEndTimeSec - visibleStartTimeSec
        : undefined,
    setVisibleDuration,
    visibleChannelsStart,
    setVisibleChannelsStart,
    numVisibleChannels,
    setNumVisibleChannels,
  };
};
