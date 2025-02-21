import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import BehavioralEventsPluginView from "./BehavioralEventsPluginView";

export const behavioralEventsPlugin: NwbObjectViewPlugin = {
  name: "BehavioralEvents",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is a BehavioralEvents neurodata_type
    if (group.attrs.neurodata_type !== "BehavioralEvents") {
      return false;
    }

    return true;
  },
  component: BehavioralEventsPluginView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};
