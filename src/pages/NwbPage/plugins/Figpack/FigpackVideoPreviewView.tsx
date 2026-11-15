import { FunctionComponent } from "react";
import FigpackJobView, { FigpackViewProps } from "./FigpackJobView";

const FigpackVideoPreviewView: FunctionComponent<FigpackViewProps> = (
  props,
) => (
  <FigpackJobView
    {...props}
    jobType="figpack_nwb_video_preview"
    pathKey="image_series_path"
    figure="Video Preview"
  />
);

export default FigpackVideoPreviewView;
