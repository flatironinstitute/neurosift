import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import {
  neurodataTypeInheritsFrom,
  neurodataTypeInheritsFromAny,
} from "../../neurodataTypeInheritance";
import TrialAlignedPluginView from "./TrialAlignedPluginView";

export const trialAlignedSeriesPlugin: NwbObjectViewPlugin = {
  name: "TrialAlignedSeries",
  canHandle: async ({ nwbUrl, path, secondaryPaths, specifications }) => {
    if (!secondaryPaths) return false;
    if (secondaryPaths.length !== 1) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      !neurodataTypeInheritsFrom(
        group.attrs["neurodata_type"],
        "TimeIntervals",
        specifications,
      )
    )
      return false;

    const secondaryPath = secondaryPaths[0];
    const secondaryGroup = await getHdf5Group(nwbUrl, secondaryPath);
    if (!secondaryGroup) return false;
    if (
      !neurodataTypeInheritsFromAny(
        secondaryGroup.attrs["neurodata_type"],
        [
          "RoiResponseSeries",
          "FiberPhotometryResponseSeries",
          "MicroscopyResponseSeries",
        ],
        specifications,
      )
    )
      return false;
    return true;
  },
  component: TrialAlignedPluginView,
  launchableFromTable: true,
  requiresWindowDimensions: true,
};
