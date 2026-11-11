import { FunctionComponent, useEffect, useState } from "react";
import PlaneSegmentationView from "./PlaneSegmentationView";
import { useHdf5Group } from "@hdf5Interface";
import { EmptyState, LoadingState, Select } from "@ui";
import "./PlaneSegmentationView.css";

type Props = {
  width: number;
  height: number;
  nwbUrl: string;
  path: string;
  condensed?: boolean;
};

const ImageSegmentationItemView: FunctionComponent<Props> = ({
  width,
  height,
  nwbUrl,
  path,
}) => {
  const group = useHdf5Group(nwbUrl, path);

  const [selectedSegmentationName, setSelectedSegmentationName] = useState<
    string | undefined
  >(undefined);
  useEffect(() => {
    if (!group) return;
    if (group.subgroups.length === 0) return;
    setSelectedSegmentationName(group.subgroups[0].name);
  }, [group]);

  if (!group)
    return <LoadingState label="Reading the segmentation" phase="loading" />;
  if (!selectedSegmentationName)
    return (
      <EmptyState title="No plane segmentations">
        This ImageSegmentation holds no PlaneSegmentation to draw.
      </EmptyState>
    );
  const picker =
    group.subgroups.length > 1 ? (
      <div className="segmentation-picker">
        <Select
          label="Plane segmentation"
          size="sm"
          value={selectedSegmentationName}
          onChange={setSelectedSegmentationName}
          options={group.subgroups.map((sg) => ({
            value: sg.name,
            label: sg.name,
          }))}
        />
      </div>
    ) : undefined;
  return (
    <PlaneSegmentationView
      width={width}
      height={height}
      imageSegmentationGroup={group}
      nwbUrl={nwbUrl}
      selectedSegmentationName={selectedSegmentationName}
      picker={picker}
    />
  );
};

export default ImageSegmentationItemView;
