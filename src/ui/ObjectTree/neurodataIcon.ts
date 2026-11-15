import type { IconName } from "../Icon/Icon";

const ICONS: [IconName, string[]][] = [
  [
    "chart--multi-line",
    ["ElectricalSeries", "RoiResponseSeries", "FiberPhotometryResponseSeries"],
  ],
  ["chart--point", ["Units"]],
  [
    "time-plot",
    ["TimeIntervals", "IntervalSeries", "Events", "BehavioralEvents"],
  ],
  ["microscope", ["TwoPhotonSeries", "OnePhotonSeries"]],
  ["layers", ["ImageSegmentation", "PlaneSegmentation"]],
  ["image", ["Images", "ImageSeries"]],
  ["video", ["ExternalVideo"]],
  ["data-table", ["DynamicTable", "ElectrodesTable"]],
  [
    "direction--curve",
    ["SpatialSeries", "Position", "PoseEstimation", "PoseEstimationSeries"],
  ],
  ["chip", ["Device"]],
  ["chart--line", ["TimeSeries"]],
];

/** The Carbon icon for a neurodata type, from the Iconography page; anything else is a document. */
export function neurodataIcon(type: string): IconName {
  return ICONS.find(([, types]) => types.includes(type))?.[0] ?? "document";
}
