import { getNwbGroup } from "@nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import RasterView from "./RasterView";

export const rasterPlugin: NwbObjectViewPlugin = {
  name: "Raster",
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
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;
    if (group.attrs["neurodata_type"] === "Units") return true;
    return false;
  },
  component: RasterView,
  special: false,
  requiresWindowDimensions: false,
  showInMultiView: true,
};

export default rasterPlugin;
