import { useHdf5Dataset, useHdf5Group } from "@hdf5Interface";
import { EmptyState, LoadingState, ViewPanel } from "@ui";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { useNwbFileSpecifications } from "../../SpecificationsView/SetupNwbFileSpecificationsProvider";
import { TIME_VIEW_CHROME, TIME_VIEW_INSET } from "../common/TimeView";
import ImagesItemView, { ImageItem } from "./ImagesItemView";

type Props = {
  nwbUrl: string;
  path: string;
  objectType: "group" | "dataset";
  onOpenObjectInNewTab?: (path: string) => void;
  width?: number;
  height?: number;
};

/** The summary above the image and the brightness and contrast sliders under it. */
const IMAGE_CHROME = TIME_VIEW_CHROME;
const MIN_VIEW = 240;

const ImagePluginView: React.FC<Props> = ({
  nwbUrl,
  path,
  objectType,
  onOpenObjectInNewTab,
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
        onOpenObjectInNewTab={onOpenObjectInNewTab}
        width={width}
        height={height}
      />
    );
  }
};

const ImagePluginViewDataset: React.FC<Props> = ({
  nwbUrl,
  path,
  width = 800,
  height = 800,
}) => {
  const dataset = useHdf5Dataset(nwbUrl, path);
  const specifications = useNwbFileSpecifications();
  if (!dataset)
    return <LoadingState label="Reading the image" phase="loading" />;
  const neurodataType = dataset.attrs.neurodata_type;
  if (neurodataTypeInheritsFrom(neurodataType, "Image", specifications)) {
    const [rows, columns, channels] = dataset.shape;
    const n = (x: number) => x.toLocaleString("en-US");
    const summary = [
      `${n(columns)} × ${n(rows)} px`,
      channels && `${channels} channels`,
      dataset.dtype,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <ViewPanel label={dataset.name} summary={summary} controls={null}>
        <ImageItem
          nwbUrl={nwbUrl}
          path={path}
          neurodataType={neurodataType}
          zoomArea={{
            width: Math.max(width - TIME_VIEW_INSET, MIN_VIEW),
            height: Math.max(height - IMAGE_CHROME, MIN_VIEW),
          }}
        />
      </ViewPanel>
    );
  } else {
    return (
      <EmptyState title="Not an image">
        {`Neurosift can’t draw ${neurodataType} as an image.`}
      </EmptyState>
    );
  }
};

const ImagePluginViewGroup: React.FC<Props> = ({
  nwbUrl,
  path,
  onOpenObjectInNewTab,
  width,
  height,
}) => {
  const group = useHdf5Group(nwbUrl, path);
  const specifications = useNwbFileSpecifications();
  if (!group)
    return <LoadingState label="Reading the images" phase="loading" />;
  const neurodataType = group.attrs.neurodata_type;
  if (neurodataTypeInheritsFrom(neurodataType, "Images", specifications)) {
    return (
      <ImagesItemView
        nwbUrl={nwbUrl}
        path={path}
        onOpenObjectInNewTab={onOpenObjectInNewTab}
        width={width || 800}
        height={height || 800}
      />
    );
  } else {
    return (
      <EmptyState title="Not an image">
        {`Neurosift can’t draw ${neurodataType} as an image.`}
      </EmptyState>
    );
  }
};

export default ImagePluginView;
