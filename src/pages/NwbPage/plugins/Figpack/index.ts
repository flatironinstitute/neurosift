import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import FigpackRasterPlotView from "./FigpackRasterPlotView";
import FigpackVideoPreviewView from "./FigpackVideoPreviewView";
import FigpackPoseEstimationView from "./FigpackPoseEstimationView";

export const figpackRasterPlotPlugin: NwbObjectViewPlugin = {
  name: "FigpackRasterPlot",
  label: "Figpack Raster",
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
  component: FigpackRasterPlotView,
  launchableFromTable: true,
  requiresWindowDimensions: false,
  showInMultiView: false,
  hideFromObjectView: true,
};

export const figpackVideoPreviewPlugin: NwbObjectViewPlugin = {
  name: "FigpackVideoPreview",
  label: "Video Preview",
  canHandle: async ({ nwbUrl, path, secondaryPaths, specifications }) => {
    if (secondaryPaths && secondaryPaths.length > 0) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      !neurodataTypeInheritsFrom(
        group.attrs["neurodata_type"],
        "ImageSeries",
        specifications,
      )
    )
      return false;

    // Check if data is external (shape contains zeros)
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) return false;
    if (dataDataset.shape.some((dim) => dim === 0)) {
      return false; // External file, don't offer this view
    }

    return true;
  },
  component: FigpackVideoPreviewView,
  launchableFromTable: true,
  requiresWindowDimensions: false,
  showInMultiView: false,
  hideFromObjectView: true,
};

export const FigpackPoseEstimationPlugin: NwbObjectViewPlugin = {
  name: "FigpackPoseEstimation",
  label: "Pose Estimation",
  canHandle: async ({ nwbUrl, path, secondaryPaths, specifications }) => {
    if (secondaryPaths && secondaryPaths.length > 0) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      neurodataTypeInheritsFrom(
        group.attrs["neurodata_type"],
        "PoseEstimation",
        specifications,
      )
    )
      return true;
    return false;
  },
  component: FigpackPoseEstimationView,
  launchableFromTable: true,
  requiresWindowDimensions: false,
  showInMultiView: false,
  hideFromObjectView: true,
};
