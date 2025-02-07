export type SimpleTimeseriesInfo = {
  visibleTimestamps: number[];
  visibleDuration: number;
  visibleData: number[][];
  startTimestamp: number;
  totalNumSamples: number;
  totalNumChannels: number;
  samplingFrequency: number;
  timeseriesStartTime: number;
  timeseriesDuration: number;
};

export type Props = {
  nwbUrl: string;
  path: string;
  width: number;
};
