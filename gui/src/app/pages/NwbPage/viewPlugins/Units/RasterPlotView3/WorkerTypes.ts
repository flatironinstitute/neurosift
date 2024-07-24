export type Plot = {
  unitId: number | string;
  spikeTimesSec: number[];
  color: string;
};

export type PlotData = {
  plots: Plot[];
};

export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  hoveredUnitId: string | number | undefined;
  selectedUnitIds: (string | number)[];
  zoomInRequired: boolean;
  infoMessage: string | undefined;
};
