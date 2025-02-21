import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import IntervalSeriesPluginView from "./IntervalSeriesPluginView";

export const intervalSeriesPlugin: NwbObjectViewPlugin = {
  name: "IntervalSeries",
  label: "Interval Series",
  component: IntervalSeriesPluginView,
  requiresWindowDimensions: true,
  async canHandle(o) {
    if (o.objectType !== "group") return false;
    const group = await getHdf5Group(o.nwbUrl, o.path);
    if (!group) return false;
    if (group.attrs.neurodata_type !== "IntervalSeries") return false;
    return true; // The actual check will happen in the view component
  },
  showInMultiView: true,
};
