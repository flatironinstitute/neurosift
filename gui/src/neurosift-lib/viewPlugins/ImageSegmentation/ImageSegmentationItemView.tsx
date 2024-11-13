import { RemoteH5FileX, RemoteH5Group } from "../../remote-h5-file/index";
import Splitter from "../../components/Splitter";
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import { useGroup } from "../../misc/hooks";
import PlaneSegmentationView from "./PlaneSegmentationView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const ImageSegmentationItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");
  const group = useGroup(nwbFile, path);

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
        nwbFile={nwbFile}
        selectedSegmentationName={selectedSegmentationName}
        setSelectedSegmentationName={setSelectedSegmentationName}
      />
      {selectedSegmentationName ? (
        <PlaneSegmentationView
          width={0}
          height={0}
          imageSegmentationGroup={group}
          nwbFile={nwbFile}
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
  group: RemoteH5Group;
  nwbFile: RemoteH5FileX;
  selectedSegmentationName?: string;
  setSelectedSegmentationName: (name: string) => void;
};

const LeftPanel: FunctionComponent<LeftPanelProps> = ({
  width,
  height,
  group,
  nwbFile,
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
