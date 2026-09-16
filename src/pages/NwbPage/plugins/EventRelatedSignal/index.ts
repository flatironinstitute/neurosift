import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import {
  isTimeSeriesLikeGroup,
  timeSeriesSamplesPerChannel,
} from "./detection";
import EventRelatedSignalView from "./EventRelatedSignalView";

// An event-related view of any TimeSeries relative to the events of a
// TimeIntervals table. Like the PSTH, it extracts short snippets of the series
// before and after each `_time` column of the table, overlaid across
// repetitions, plus the trial-averaged trace.
export const eventRelatedSignalPlugin: NwbObjectViewPlugin = {
  name: "EventRelatedSignal",
  label: "Event Related Signal",
  canHandle: async ({
    nwbUrl,
    path,
    objectType,
    secondaryPaths,
  }: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
    secondaryPaths?: string[];
  }) => {
    if (objectType !== "group") return false;
    if (!secondaryPaths) return false;
    if (secondaryPaths.length !== 1) return false;

    // Primary object must be a TimeIntervals table.
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs["neurodata_type"] !== "TimeIntervals") return false;

    // Secondary object must be a timeseries-like group.
    const secondaryGroup = await getHdf5Group(nwbUrl, secondaryPaths[0]);
    if (!secondaryGroup) return false;
    return isTimeSeriesLikeGroup(secondaryGroup.datasets);
  },
  // Show an "Event Related Signal" button on a TimeIntervals table only when the file
  // also contains at least one compatible TimeSeries. The button opens the view
  // defaulting to the lightest series (fewest samples per channel, so it renders
  // fastest); the view offers a picker to switch between the available series.
  getLaunchSecondaryPaths: ({ path, objectType, neurodataObjects }) => {
    if (objectType !== "group") return [];
    const primary = neurodataObjects.find((o) => o.path === path);
    if (!primary) return [];
    if (primary.attrs?.["neurodata_type"] !== "TimeIntervals") return [];
    const seriesObjs = neurodataObjects.filter(
      (o) => o.group && isTimeSeriesLikeGroup(o.group.datasets),
    );
    if (seriesObjs.length === 0) return [];
    seriesObjs.sort(
      (a, b) =>
        timeSeriesSamplesPerChannel(a.group!.datasets) -
        timeSeriesSamplesPerChannel(b.group!.datasets),
    );
    return [[seriesObjs[0].path]];
  },
  component: EventRelatedSignalView,
  // Launch from a dedicated button next to the object (like PSTH) rather than
  // rendering inline alongside the main timeseries view.
  launchableFromTable: true,
  requiresWindowDimensions: true,
};

export default eventRelatedSignalPlugin;
