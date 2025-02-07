import { getNwbGroup } from "@nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import TimeIntervalsPluginView from "./TimeIntervalsPluginView";

export const timeIntervalsPlugin: NwbObjectViewPlugin = {
  name: "TimeIntervals",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;

    // Check if this is a TimeIntervals neurodata type
    const isTimeIntervals = group.attrs?.neurodata_type === "TimeIntervals";
    if (!isTimeIntervals) return false;

    // Check for required datasets
    const hasStartTime = group.datasets.some((ds) => ds.name === "start_time");
    const hasStopTime = group.datasets.some((ds) => ds.name === "stop_time");

    return hasStartTime && hasStopTime;
  },
  component: TimeIntervalsPluginView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};
