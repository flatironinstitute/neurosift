import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import BehavioralBoutsView from "./BehavioralBoutsView";

export const behavioralBoutsPlugin: NwbObjectViewPlugin = {
  name: "BehavioralBouts",
  label: "Behavioral bouts",
  // Activates on an ndx-behavioral-bouts BehavioralBouts group (a TimeIntervals
  // subclass), so the bouts render as a video-synced ethogram strip.
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs?.neurodata_type !== "BehavioralBouts") return false;
    const hasStartTime = group.datasets.some((ds) => ds.name === "start_time");
    const hasStopTime = group.datasets.some((ds) => ds.name === "stop_time");
    return hasStartTime && hasStopTime;
  },
  component: BehavioralBoutsView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};

export default behavioralBoutsPlugin;
