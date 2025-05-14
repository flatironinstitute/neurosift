import { FunctionComponent } from "react";
import ImageSegmentationItemView from "./ImageSegmentationItemView/ImageSegmentationItemView";
import PlaneSegmentationView from "./ImageSegmentationItemView/PlaneSegmentationView";
import { useHdf5Group } from "@hdf5Interface";

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

export const PlaneSegmentationPluginView: FunctionComponent<Props> = ({
  nwbUrl,
  path,
  width = 600,
  height = 400,
}) => {
  const parentPath = path.split("/").slice(0, -1).join("/");
  const pathName = path.split("/").slice(-1)[0];
  const imageSegmentationGroup = useHdf5Group(nwbUrl, parentPath);
  if (!imageSegmentationGroup) return <div>Loading group: {parentPath}</div>;

  if (!width || !height) return <div>Width and height are required.</div>;

  return (
    <PlaneSegmentationView
      width={width}
      height={height}
      imageSegmentationGroup={imageSegmentationGroup}
      nwbUrl={nwbUrl}
      selectedSegmentationName={pathName}
    />
  );
};

export default ImageSegmentationPluginView;
