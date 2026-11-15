/* eslint-disable @typescript-eslint/no-explicit-any */
export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  /** Colors for the chart's theme, since a worker can't read the page's CSS. */
  colors: {
    stripes: string[];
    text: string;
    mark: string;
    categories: string[];
  };
};

/** The category hues on a light chart; dark lifts each as far as it needs. */
export const CATEGORY_COLORS = [
  "#000000",
  "#0000ff",
  "#00ff00",
  "#ff0000",
  "#ffff00",
  "#ff00ff",
  "#00ffff",
  "#880000",
  "#008800",
  "#000088",
  "#888800",
  "#880088",
  "#008888",
];

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
