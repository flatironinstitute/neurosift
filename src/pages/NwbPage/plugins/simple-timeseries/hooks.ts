/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNwbGroup } from "@nwbInterface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { useCallback, useEffect, useRef, useState } from "react";
import TimeseriesClient, { ChunkedTimeseriesClient } from "./TimeseriesClient";
import { SimpleTimeseriesInfo } from "./types";

export const useTimeseriesClient = (nwbUrl: string, path: string) => {
  const [timeseriesClient, setTimeseriesClient] =
    useState<ChunkedTimeseriesClient>();
  const [error, setError] = useState<string>();

  const group = useNwbGroup(nwbUrl, path);

  useEffect(() => {
    if (!group) return;
    const load = async () => {
      try {
        const client = await ChunkedTimeseriesClient.create(nwbUrl, group, {});
        setTimeseriesClient(client);
      } catch (err: any) {
        setError(err.message);
      }
    };
    load();
  }, [nwbUrl, group]);

  return { timeseriesClient, error };
};

export const useTimeseriesData = (
  nwbUrl: string,
  path: string,
): {
  timeseriesClient: TimeseriesClient | undefined;
  error: string | undefined;
  isLoading: boolean;
  info: SimpleTimeseriesInfo | undefined;
  visibleTimeStart: number | undefined;
  setVisibleTimeStart: (time: number) => void;
  visibleDuration: number | undefined;
  setVisibleDuration: (duration: number) => void;
  visibleChannelsStart: number;
  setVisibleChannelsStart: (start: number) => void;
  numVisibleChannels: number;
  setNumVisibleChannels: (num: number) => void;
} => {
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [info, setInfo] = useState<SimpleTimeseriesInfo>();

  const { timeseriesClient } = useTimeseriesClient(nwbUrl, path);

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
      const startTime = timeseriesClient.startTime;
      const endTime = timeseriesClient.endTime;
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
    const freq = timeseriesClient.samplingFrequency;
    setVisibleDuration(500 / freq);
    didInitializeVisibleDuration.current = true;
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
      const samplingFrequency = timeseriesClient.samplingFrequency;
      const numSamples = timeseriesClient.numSamples;
      const visibleChannelsEnd = Math.min(
        visibleChannelsStart + numVisibleChannels,
        timeseriesClient.numChannels,
      );
      const startTime = timeseriesClient.startTime;
      const duration = timeseriesClient.duration;
      const { data, timestamps } = await timeseriesClient.getDataForTimeRange(
        tStart,
        tStart + visibleDuration,
        visibleChannelsStart,
        visibleChannelsEnd,
      );

      setInfo({
        visibleTimestamps: timestamps,
        visibleDuration: visibleDuration,
        visibleData: data,
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
