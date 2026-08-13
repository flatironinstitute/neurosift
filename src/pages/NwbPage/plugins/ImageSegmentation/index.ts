import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import ImageSegmentationPluginView, {
  PlaneSegmentationPluginView,
} from "./ImageSegmentationPluginView";

export const imageSegmentationPlugin: NwbObjectViewPlugin = {
  name: "ImageSegmentation",
  canHandle: async ({ nwbUrl, path, specifications }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is an ImageSegmentation neurodata_type
    if (
      !neurodataTypeInheritsFrom(
        group.attrs.neurodata_type,
        "ImageSegmentation",
        specifications,
      )
    )
      return false;

    // Check if we have any subgroups (plane segmentations)
    return group.subgroups.length > 0;
  },
  component: ImageSegmentationPluginView,
  // We need window dimensions since we're displaying image segments
  requiresWindowDimensions: true,
  showInMultiView: true,
};

export const planeSegmentationPlugin: NwbObjectViewPlugin = {
  name: "PlaneSegmentation",
  canHandle: async ({ nwbUrl, path, specifications }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is an PlaneSegmentation neurodata_type
    if (
      !neurodataTypeInheritsFrom(
        group.attrs.neurodata_type,
        "PlaneSegmentation",
        specifications,
      )
    )
      return false;

    // Check if this is a subgroup of an ImageSegmentation
    const parentPath = path.split("/").slice(0, -1).join("/");
    const parentGroup = await getHdf5Group(nwbUrl, parentPath);
    if (!parentGroup) return false;
    // Check if the parent group is an ImageSegmentation
    if (
      !neurodataTypeInheritsFrom(
        parentGroup.attrs.neurodata_type,
        "ImageSegmentation",
        specifications,
      )
    )
      return false;

    return true;
  },
  component: PlaneSegmentationPluginView,
  // We need window dimensions since we're displaying image segments
  requiresWindowDimensions: true,
  showInMultiView: true,
};
