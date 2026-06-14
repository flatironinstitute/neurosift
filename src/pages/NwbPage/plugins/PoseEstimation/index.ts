import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import PoseEstimationView from "./PoseEstimationView";

export const poseEstimationPlugin: NwbObjectViewPlugin = {
  name: "PoseEstimation",
  label: "Pose overlay",
  // Activates on an ndx-pose PoseEstimation container that holds at least one
  // PoseEstimationSeries.
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs?.neurodata_type !== "PoseEstimation") return false;
    return group.subgroups.some(
      (sg) => sg.attrs?.neurodata_type === "PoseEstimationSeries",
    );
  },
  component: PoseEstimationView,
  requiresWindowDimensions: true,
  showInMultiView: false,
  launchableFromTable: true,
};

export default poseEstimationPlugin;
