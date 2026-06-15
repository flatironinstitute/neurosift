import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import TimeIntervalsPluginView from "./TimeIntervalsPluginView";

export const timeIntervalsPlugin: NwbObjectViewPlugin = {
  name: "TimeIntervals",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is a TimeIntervals neurodata type
    const nt = group.attrs?.neurodata_type;
    const isTimeIntervals = [
      "TimeIntervals",
      "OptogeneticPulsesTable",
      // BehavioralBouts (ndx-behavioral-bouts) is a TimeIntervals subclass, so
      // it renders fine here as a fallback. The dedicated BehavioralBouts plugin
      // is registered before this one and wins as the default view.
      "BehavioralBouts",
    ].includes(nt);
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
