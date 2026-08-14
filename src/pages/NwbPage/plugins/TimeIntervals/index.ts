import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import TimeIntervalsPluginView from "./TimeIntervalsPluginView";

export const timeIntervalsPlugin: NwbObjectViewPlugin = {
  name: "TimeIntervals",
  canHandle: async ({ nwbUrl, path, specifications }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is a TimeIntervals neurodata type
    const nt = group.attrs?.neurodata_type;
    if (!neurodataTypeInheritsFrom(nt, "TimeIntervals", specifications))
      return false;

    // Check for required datasets
    const hasStartTime = group.datasets.some((ds) => ds.name === "start_time");
    const hasStopTime = group.datasets.some((ds) => ds.name === "stop_time");

    return hasStartTime && hasStopTime;
  },
  component: TimeIntervalsPluginView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};
