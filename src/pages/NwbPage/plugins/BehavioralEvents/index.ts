import { getHdf5Group } from "@hdf5Interface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { NwbObjectViewPlugin } from "../pluginInterface";
import BehavioralEventsPluginView from "./BehavioralEventsPluginView";

export const behavioralEventsPlugin: NwbObjectViewPlugin = {
  name: "BehavioralEvents",
  canHandle: async ({ nwbUrl, path, specifications }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is a BehavioralEvents neurodata_type
    if (
      !neurodataTypeInheritsFrom(
        group.attrs.neurodata_type,
        "BehavioralEvents",
        specifications,
      )
    ) {
      return false;
    }

    return true;
  },
  component: BehavioralEventsPluginView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};
