export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
};

export type EventSeries = {
  name: string;
  categories: any[];
  timestamps: number[];
  data: any[];
};

export type BehavioralEventsData = {
  seriesNames: string[];
  series: { [seriesName: string]: EventSeries };
};
