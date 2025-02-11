/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNwbGroup } from "@nwbInterface";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChunkedTimeseriesClient } from "./TimeseriesClient";
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
  timeseriesClient: ChunkedTimeseriesClient | undefined;
  error: string | undefined;
  isLoading: boolean;
  info: SimpleTimeseriesInfo | undefined;
  loadedTimestamps: number[];
  loadedData: number[][];
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

  // initialize the number of visible channels to be min(4, numChannels)
  useEffect(() => {
    if (!timeseriesClient) return;
    setNumVisibleChannels(Math.min(4, timeseriesClient.numChannels));
  }, [timeseriesClient]);

  const [loadedTimestamps, setLoadedTimestamps] = useState<number[]>([]);
  const [loadedData, setLoadedData] = useState<number[][]>([]);

  useEffect(() => {
    if (!timeseriesClient) return;
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
    const startTime = timeseriesClient.startTime;
    const duration = timeseriesClient.duration;
    setInfo({
      visibleDuration: visibleDuration,
      startTimestamp: tStart,
      totalNumSamples: numSamples,
      totalNumChannels: timeseriesClient.numChannels,
      samplingFrequency: samplingFrequency,
      timeseriesStartTime: startTime,
      timeseriesDuration: duration,
    });
  }, [
    startTimeSec,
    endTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
    timeseriesClient,
  ]);

  // The buffered visible time range changes less frequently than the visible time range
  const { bufferedVisibleStartTimeSec, bufferedVisibleEndTimeSec } =
    useMemo(() => {
      if (!timeseriesClient)
        return {
          bufferedVisibleStartTimeSec: undefined,
          bufferedVisibleEndTimeSec: undefined,
        };
      if (visibleStartTimeSec === undefined)
        return {
          bufferedVisibleStartTimeSec: undefined,
          bufferedVisibleEndTimeSec: undefined,
        };
      if (visibleEndTimeSec === undefined)
        return {
          bufferedVisibleStartTimeSec: undefined,
          bufferedVisibleEndTimeSec: undefined,
        };
      const chunkSizeSec = timeseriesClient.chunkSizeSec;
      const chunkGrid = 2;
      const bufferedVisibleStartTimeSec =
        Math.floor(visibleStartTimeSec / (chunkSizeSec * chunkGrid)) *
        (chunkSizeSec * chunkGrid);
      const bufferedVisibleEndTimeSec =
        Math.ceil(visibleEndTimeSec / (chunkSizeSec * chunkGrid)) *
        (chunkSizeSec * chunkGrid);
      return { bufferedVisibleStartTimeSec, bufferedVisibleEndTimeSec };
    }, [timeseriesClient, visibleStartTimeSec, visibleEndTimeSec]);

  // Load data when view parameters change
  useEffect(() => {
    if (!timeseriesClient) return;
    setIsLoading(true);
    const load = async () => {
      if (bufferedVisibleStartTimeSec === undefined) return;
      if (bufferedVisibleEndTimeSec === undefined) return;
      const visibleChannelsEnd = Math.min(
        visibleChannelsStart + numVisibleChannels,
        timeseriesClient.numChannels,
      );
      const { data, timestamps } = await timeseriesClient.getDataForTimeRange(
        bufferedVisibleStartTimeSec,
        bufferedVisibleEndTimeSec,
        visibleChannelsStart,
        visibleChannelsEnd,
      );
      setLoadedTimestamps(timestamps);
      setLoadedData(data);
      setIsLoading(false);
    };
    load().catch((err) => {
      setError(err.message);
      setIsLoading(false);
    });
  }, [
    timeseriesClient,
    bufferedVisibleStartTimeSec,
    bufferedVisibleEndTimeSec,
    visibleChannelsStart,
    numVisibleChannels,
    startTimeSec,
  ]);

  return {
    timeseriesClient,
    error,
    isLoading,
    info,
    loadedTimestamps,
    loadedData,
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
