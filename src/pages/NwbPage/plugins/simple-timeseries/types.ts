export type SimpleTimeseriesInfo = {
  visibleDuration: number;
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
  width?: number;
  condensed?: boolean;
};

export type TimeseriesPlotProps = {
  timestamps: number[];
  data: number[][];
  visibleStartTime: number;
  visibleEndTime: number;
  channelNames?: string[];
  channelSeparation: number;
  width: number;
  height: number;
};

export type PlotOpts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  channelSeparation: number;
  data: number[][];
  timestamps: number[];
};
