import { FunctionComponent } from "react";
import FigpackJobView, { FigpackViewProps } from "./FigpackJobView";

const FigpackPoseEstimationView: FunctionComponent<FigpackViewProps> = (
  props,
) => (
  <FigpackJobView
    {...props}
    jobType="figpack_nwb_pose_estimation"
    pathKey="path"
    figure="Pose Estimation"
  />
);

export default FigpackPoseEstimationView;
