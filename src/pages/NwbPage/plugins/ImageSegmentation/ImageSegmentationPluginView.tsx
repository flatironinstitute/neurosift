import { FunctionComponent } from "react";
import ImageSegmentationItemView from "./ImageSegmentationItemView/ImageSegmentationItemView";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
  secondaryPaths?: string[];
  width?: number;
  height?: number;
};

const ImageSegmentationPluginView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 600,
  height = 400,
}) => {
  if (!width || !height) return <div>Width and height are required.</div>;

  return (
    <ImageSegmentationItemView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
    />
  );
};

export default ImageSegmentationPluginView;
