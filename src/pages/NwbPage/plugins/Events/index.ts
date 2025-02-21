import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import EventsPluginView from "./EventsPluginView";

export const eventsPlugin: NwbObjectViewPlugin = {
  name: "Events",
  label: "Events",
  component: EventsPluginView,
  requiresWindowDimensions: true,
  async canHandle(o) {
    if (o.objectType !== "group") return false;
    const group = await getHdf5Group(o.nwbUrl, o.path);
    if (!group) return false;
    if (group.attrs.neurodata_type !== "Events") return false;
    const timestampsDataset = group.datasets.find(
      (ds) => ds.name === "timestamps",
    );
    if (!timestampsDataset) return false;
    return true;
  },
  showInMultiView: true,
};
