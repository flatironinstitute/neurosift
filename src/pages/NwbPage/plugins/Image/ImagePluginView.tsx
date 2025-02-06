import { useNwbDataset, useNwbGroup } from "../../nwbInterface";
import ImagesItemView, { ImageItem } from "./ImagesItemView";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  width?: number;
  height?: number;
};

const ImagePluginView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
  width,
  height,
}) => {
  if (objectType === "dataset") {
    return (
      <ImagePluginViewDataset
        nwbUrl={nwbUrl}
        path={path}
        objectType={objectType}
        width={width}
        height={height}
      />
    );
  } else {
    return (
      <ImagePluginViewGroup
        nwbUrl={nwbUrl}
        path={path}
        objectType={objectType}
        width={width}
        height={height}
      />
    );
  }
};

const ImagePluginViewDataset: React.FC<Props> = ({ nwbUrl, path }) => {
  const dataset = useNwbDataset(nwbUrl, path);
  if (!dataset) return <div>Loading dataset...</div>;
  const neurodataType = dataset.attrs.neurodata_type;
  if (
    ["Image", "GrayscaleImage", "RGBImage", "RGBAImage"].includes(neurodataType)
  ) {
    return (
      <ImageItem nwbUrl={nwbUrl} path={path} neurodataType={neurodataType} />
    );
  } else {
    return <div>Unexpected neurodata_type: {neurodataType}</div>;
  }
};

const ImagePluginViewGroup: React.FC<Props> = ({
  nwbUrl,
  path,
  width,
  height,
}) => {
  const group = useNwbGroup(nwbUrl, path);
  if (!group) return <div>Loading group...</div>;
  const neurodataType = group.attrs.neurodata_type;
  if (["Images"].includes(neurodataType)) {
    return (
      <ImagesItemView
        nwbUrl={nwbUrl}
        path={path}
        width={width || 800}
        height={height || 800}
      />
    );
  } else {
    return <div>Unexpected neurodata_type: {neurodataType}</div>;
  }
};

export default ImagePluginView;
