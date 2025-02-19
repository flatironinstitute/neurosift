import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import SpikeDensityView from "./SpikeDensityView";

export const spikeDensityPlugin: NwbObjectViewPlugin = {
  name: "SpikeDensity",
  canHandle: async ({
    nwbUrl,
    path,
    secondaryPaths,
  }: {
    nwbUrl: string;
    path: string;
    secondaryPaths?: string[];
  }) => {
    if (secondaryPaths && secondaryPaths.length > 0) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs["neurodata_type"] === "Units") return true;
    return false;
  },
  component: SpikeDensityView,
  launchableFromTable: true,
  requiresWindowDimensions: false,
  showInMultiView: false,
};

export default spikeDensityPlugin;
