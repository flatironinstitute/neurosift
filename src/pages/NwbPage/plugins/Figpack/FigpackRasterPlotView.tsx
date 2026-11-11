import { FunctionComponent } from "react";
import FigpackJobView, { FigpackViewProps } from "./FigpackJobView";

const FigpackRasterPlotView: FunctionComponent<FigpackViewProps> = (props) => (
  <FigpackJobView
    {...props}
    jobType="figpack_nwb_raster_plot"
    pathKey="units_path"
    figure="Raster Plot"
  />
);

export default FigpackRasterPlotView;
