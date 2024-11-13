export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  xAxisLabel: string;
  yAxisLabel: string;
  zoomInRequired: boolean;
};

export type DataSeries = {
  t: number[];
  x: number[];
  y: number[];
};
