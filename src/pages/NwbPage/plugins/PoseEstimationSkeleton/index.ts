import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import PoseEstimationSkeletonView from "./PoseEstimationSkeletonView";

export const poseEstimationSkeletonPlugin: NwbObjectViewPlugin = {
  name: "PoseEstimationSkeleton",
  label: "Skeleton Plot",
  canHandle: async ({ nwbUrl, path }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    
    // Handle PoseEstimation containers
    if (group.attrs["neurodata_type"] === "PoseEstimation") {
      // Verify it has pose estimation series
      const hasPoseSeries = group.subgroups.some(
        (g: any) => g.attrs?.neurodata_type === "PoseEstimationSeries"
      );
      return hasPoseSeries;
    }
    
    return false;
  },
  component: PoseEstimationSkeletonView,
  requiresWindowDimensions: true,
  showInMultiView: true,  // Important for multi-view layouts
  launchableFromTable: false,
};
