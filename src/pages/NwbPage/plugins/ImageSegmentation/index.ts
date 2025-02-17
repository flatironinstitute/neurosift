import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ImageSegmentationPluginView from "./ImageSegmentationPluginView";

export const imageSegmentationPlugin: NwbObjectViewPlugin = {
  name: "ImageSegmentation",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is an ImageSegmentation neurodata_type
    if (group.attrs.neurodata_type !== "ImageSegmentation") return false;

    // Check if we have any subgroups (plane segmentations)
    return group.subgroups.length > 0;
  },
  component: ImageSegmentationPluginView,
  // We need window dimensions since we're displaying image segments
  requiresWindowDimensions: true,
  showInMultiView: true,
};
