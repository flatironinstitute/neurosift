import { FunctionComponent } from "react";
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
    <SpatialSeriesXYView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
    />
  );
};

export default SpatialSeriesPluginView;
