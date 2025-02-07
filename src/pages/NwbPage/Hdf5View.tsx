import { FunctionComponent, useState } from "react";
import "@css/Hdf5View.css";
import { NwbGroup, useNwbGroup } from "./nwbInterface";
import TopLevelGroupContentPanel from "./TopLevelGroupContentPanel";

type Props = {
  nwbUrl: string;
  width: number;
  isExpanded?: boolean;
};

const Hdf5View: FunctionComponent<Props> = ({ nwbUrl, width, isExpanded }) => {
  const rootGroup = useNwbGroup(nwbUrl, "/");

  if (!rootGroup && isExpanded) return <div>Loading...</div>;

  return (
    <div className="hdf5-view-container" style={{ width }}>
      {rootGroup && (
        <div>
          {rootGroup.subgroups.map((sg) => (
            <TopLevelGroupView key={sg.name} nwbUrl={nwbUrl} name={sg.name} />
          ))}
          <hr />
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
  const group = useNwbGroup(nwbUrl, "/" + name);
  const expandable =
    group && (group.subgroups.length > 0 || group.datasets.length > 0);
  return (
    <div className="top-level-group">
      <div
        className={`group-title-panel ${expanded ? "expanded" : ""}`}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        <span className="expander">
          {expandable ? expanded ? "▼" : "►" : <>&nbsp;&nbsp;&nbsp;</>}
        </span>
        <span className="group-name">{name}</span>
        <GroupTitlePanelText name={name} group={group} nwbUrl={nwbUrl} />
      </div>
      {expanded && group && (
        <TopLevelGroupContentPanel name={name} group={group} nwbUrl={nwbUrl} />
      )}
    </div>
  );
};

type GroupTitlePanelTextProps = {
  name: string;
  group: NwbGroup | undefined;
  nwbUrl: string;
};

const GroupTitlePanelText: FunctionComponent<GroupTitlePanelTextProps> = ({
  group,
}) => {
  if (!group) return <span>-</span>;
  return (
    <span className="group-count">
      ({group.subgroups.length + group.datasets.length})
    </span>
  );
};

export default Hdf5View;
