import { FunctionComponent } from "react";
import { SetupTimeseriesSelection } from "../PSTH/PSTHItemView/context-timeseries-selection";
import SpatialSeriesXYView from "./SpatialSeriesXYView/SpatialSeriesXYView";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const SpatialSeriesPluginView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 600,
  height = 400,
}) => {
  console.log("SpatialSeriesPluginView", nwbUrl, path, width, height);
  if (!width || !height) return <div>Width and height are required.</div>;

  return (
    <SetupTimeseriesSelection>
      <SpatialSeriesXYView
        width={width}
        height={height}
        nwbUrl={nwbUrl}
        path={path}
      />
    </SetupTimeseriesSelection>
  );
};

export default SpatialSeriesPluginView;
