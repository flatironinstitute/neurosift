import { lazy } from "react";
import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";

const IntervalSeriesPluginView = lazy(
  () => import("./IntervalSeriesPluginView"),
);

export const intervalSeriesPlugin: NwbObjectViewPlugin = {
  name: "IntervalSeries",
  label: "Interval Series",
  component: IntervalSeriesPluginView,
  requiresWindowDimensions: true,
  async canHandle(o) {
    if (o.objectType !== "group") return false;
    const group = await getHdf5Group(o.nwbUrl, o.path);
    if (!group) return false;
    if (
      !neurodataTypeInheritsFrom(
        group.attrs.neurodata_type,
        "IntervalSeries",
        o.specifications,
      )
    )
      return false;
    return true; // The actual check will happen in the view component
  },
  showInMultiView: true,
};
