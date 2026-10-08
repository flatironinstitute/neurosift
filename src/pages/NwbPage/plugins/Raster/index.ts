import { lazy } from "react";
import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";

const RasterView = lazy(() => import("./RasterView"));

export const rasterPlugin: NwbObjectViewPlugin = {
  name: "Raster",
  canHandle: async ({ nwbUrl, path, secondaryPaths, specifications }) => {
    if (secondaryPaths && secondaryPaths.length > 0) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      neurodataTypeInheritsFrom(
        group.attrs["neurodata_type"],
        "Units",
        specifications,
      )
    )
      return true;
    return false;
  },
  component: RasterView,
  launchableFromTable: true,
  requiresWindowDimensions: false,
  showInMultiView: false,
};

export default rasterPlugin;
