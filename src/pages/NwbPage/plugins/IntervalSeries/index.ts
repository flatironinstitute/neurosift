import { NwbObjectViewPlugin } from "../pluginInterface";
import IntervalSeriesPluginView from "./IntervalSeriesPluginView";

export const intervalSeriesPlugin: NwbObjectViewPlugin = {
  name: "IntervalSeries",
  label: "Interval Series",
  component: IntervalSeriesPluginView,
  requiresWindowDimensions: true,
  async canHandle(o) {
    if (o.objectType !== "group") return false;
    // check if timestamps and data exist
    return true; // The actual check will happen in the view component
  },
};
