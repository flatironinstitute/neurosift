import { FunctionComponent, useState } from "react";
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
    <div style={{ position: "relative", width }}>
      {rootGroup && (
        <div style={{ marginTop: 10 }}>
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
  const titlePanelBackgroundColor = expanded ? "#797" : "#8a8";
  const titlePanelTextColor = expanded ? "white" : "#fff";
  const expandable =
    group && (group.subgroups.length > 0 || group.datasets.length > 0);
  return (
    <div style={{ marginLeft: 10, userSelect: "none" }}>
      <div
        style={{
          cursor: "pointer",
          paddingTop: 10,
          paddingBottom: 10,
          marginTop: 10,
          background: titlePanelBackgroundColor,
          color: titlePanelTextColor,
          border: "solid 1px black",
        }}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        {expandable ? expanded ? "▼" : "►" : <>&nbsp;&nbsp;&nbsp;</>} {name}{" "}
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
  return <span>({group.subgroups.length + group.datasets.length})</span>;
};

export default Hdf5View;
