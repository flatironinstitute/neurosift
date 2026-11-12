import { FunctionComponent, useEffect, useState } from "react";
import PlaneSegmentationView from "./PlaneSegmentationView";
import { Hdf5Group, useHdf5Group } from "@hdf5Interface";
import { Splitter } from "@fi-sci/splitter";

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

  if (!group) return <div>Loading group: {path}</div>;
  return (
    <Splitter
      width={width}
      height={height}
      initialPosition={Math.min(400, width / 3)}
    >
      <LeftPanel
        width={0}
        height={0}
        group={group}
        nwbUrl={nwbUrl}
        selectedSegmentationName={selectedSegmentationName}
        setSelectedSegmentationName={setSelectedSegmentationName}
      />
      {selectedSegmentationName ? (
        <PlaneSegmentationView
          width={0}
          height={0}
          imageSegmentationGroup={group}
          nwbUrl={nwbUrl}
          selectedSegmentationName={selectedSegmentationName}
        />
      ) : (
        <div />
      )}
    </Splitter>
  );
};

type LeftPanelProps = {
  width: number;
  height: number;
  group: Hdf5Group;
  nwbUrl: string;
  selectedSegmentationName?: string;
  setSelectedSegmentationName: (name: string) => void;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  group,
  selectedSegmentationName,
  setSelectedSegmentationName,
}) => {
  return (
    <table className="nwb-table">
      <tbody>
        {group.subgroups.map((sg) => (
          <tr key={sg.name}>
            <td>
              <input
                type="radio"
                name="segmentation"
                checked={sg.name === selectedSegmentationName}
                onChange={() => setSelectedSegmentationName(sg.name)}
              />
            </td>
            <td>{sg.name}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default ImageSegmentationItemView;
