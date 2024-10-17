export type MatrixData = {
  startTimeSec: number;
  binSizeSec: number;
  numBins: number;
  numUnits: number;
  spikeCounts: number[];
};

export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  hoveredUnitId: string | number | undefined;
  selectedUnitIds: (string | number)[];
  isort?: number[];
};
