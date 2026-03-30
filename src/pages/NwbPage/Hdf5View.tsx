import { FunctionComponent, useState } from "react";
import "@css/Hdf5View.css";
import { useHdf5Group } from "./hdf5Interface";
import TopLevelGroupContentPanel from "./TopLevelGroupContentPanel";
import {
  FaFolder,
  FaFolderOpen,
} from "react-icons/fa";

type Props = {
  nwbUrl: string;
  width: number;
  isExpanded?: boolean;
};

const Hdf5View: FunctionComponent<Props> = ({ nwbUrl, width, isExpanded }) => {
  const rootGroup = useHdf5Group(nwbUrl, "/");

  if (!rootGroup && isExpanded) return <div>Loading...</div>;

  return (
    <div className="hdf5-view-container" style={{ width }}>
      {rootGroup && (
        <div>
          {rootGroup.subgroups.map((sg) => (
            <TopLevelGroupView key={sg.name} nwbUrl={nwbUrl} name={sg.name} />
          ))}
          <TopLevelGroupContentPanel
            name={"/"}
            group={rootGroup}
            nwbUrl={nwbUrl}
            excludeGroups={true}
          />
        </div>
      )}
    </div>
  );
};

type TopLevelGroupViewProps = {
  nwbUrl: string;
  name: string;
};

const TopLevelGroupView: FunctionComponent<TopLevelGroupViewProps> = ({
  nwbUrl,
  name,
}) => {
  const [expanded, setExpanded] = useState(false);
  const group = useHdf5Group(nwbUrl, "/" + name);
  const expandable =
    group && (group.subgroups.length > 0 || group.datasets.length > 0);
  const itemCount = group
    ? group.subgroups.length + group.datasets.length
    : 0;

  return (
    <div className="hdf5-tree-node">
      <div
        className="hdf5-tree-row group-row"
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <span className="tree-expander">
          {expandable ? (expanded ? "▾" : "▸") : ""}
        </span>
        <span className={`tree-icon ${expanded ? "icon-folder-open" : "icon-folder"}`}>
          {expanded ? <FaFolderOpen /> : <FaFolder />}
        </span>
        <span className="tree-label">{name}</span>
        {itemCount > 0 && (
          <span className="tree-meta">{itemCount} items</span>
        )}
      </div>
      {expanded && group && (
        <div style={{ paddingLeft: 16 }}>
          <TopLevelGroupContentPanel name={name} group={group} nwbUrl={nwbUrl} />
        </div>
      )}
    </div>
  );
};

export default Hdf5View;
