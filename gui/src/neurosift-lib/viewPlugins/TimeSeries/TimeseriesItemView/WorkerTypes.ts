export type Opts = {
  canvasWidth: number;
  canvasHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
  visibleStartTimeSec: number;
  visibleEndTimeSec: number;
  minValue: number;
  maxValue: number;
  hideLegend: boolean;
  legendOpts: { location: "northwest" | "northeast" };
  zoomInRequired: boolean;
};

export type DataSeries = {
  type: string;
  title?: string;
  attributes: { [key: string]: any };
  t: number[];
  y: number[];
};

export type TimeseriesAnnotationFileData = {
  type: "TimeseriesAnnotation";
  events: {
    s: number; // start time sec
    e: number; // end time sec
    t: string; // type
    i: string; // id
  }[];
  event_types: {
    event_type: string;
    label: string;
    color_index: number;
  }[];
};

export type SpikeTrainsDataForWorker = {
  unitId: string | number;
  color: string;
  spikeTimesSec: number[];
}[];
