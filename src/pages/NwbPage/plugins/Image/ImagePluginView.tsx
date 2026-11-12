import { useHdf5Dataset, useHdf5Group } from "@hdf5Interface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { useNwbFileSpecifications } from "../../SpecificationsView/SetupNwbFileSpecificationsProvider";
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
  const dataset = useHdf5Dataset(nwbUrl, path);
  const specifications = useNwbFileSpecifications();
  if (!dataset) return <div>Loading dataset...</div>;
  const neurodataType = dataset.attrs.neurodata_type;
  if (neurodataTypeInheritsFrom(neurodataType, "Image", specifications)) {
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
  const group = useHdf5Group(nwbUrl, path);
  const specifications = useNwbFileSpecifications();
  if (!group) return <div>Loading group...</div>;
  const neurodataType = group.attrs.neurodata_type;
  if (neurodataTypeInheritsFrom(neurodataType, "Images", specifications)) {
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
