import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import TrialAlignedPluginView from "./TrialAlignedPluginView";

export const trialAlignedSeriesPlugin: NwbObjectViewPlugin = {
  name: "TrialAlignedSeries",
  canHandle: async ({
    nwbUrl,
    path,
    secondaryPaths,
  }: {
    nwbUrl: string;
    path: string;
    secondaryPaths?: string[];
  }) => {
    if (!secondaryPaths) return false;
    if (secondaryPaths.length !== 1) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs["neurodata_type"] !== "TimeIntervals") return false;

    const secondaryPath = secondaryPaths[0];
    const secondaryGroup = await getHdf5Group(nwbUrl, secondaryPath);
    if (!secondaryGroup) return false;
    if (
      ![
        "RoiResponseSeries",
        "FiberPhotometryResponseSeries",
        "MicroscopyResponseSeries",
      ].includes(secondaryGroup.attrs["neurodata_type"])
    )
      return false;
    return true;
  },
  component: TrialAlignedPluginView,
  launchableFromTable: true,
  requiresWindowDimensions: true,
};
