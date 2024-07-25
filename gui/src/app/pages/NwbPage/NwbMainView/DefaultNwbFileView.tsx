import { RemoteH5FileX, RemoteH5Group } from "@remote-h5-file/index";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import TopLevelGroupContentPanel from "../BrowseNwbView/TopLevelGroupContentPanel";
import IntervalsContentPanel from "./IntervalsContentPanel";
import { useGroup } from "./NwbMainView";
import ProcessingGroupContentPanel from "./ProcessingGroupContentPanel";
import UnitsContentPanel from "./UnitsContentPanel";

type Props = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
};

type Heading = {
  name: string;
  label: string;
  groupPath: string;
};

const DefaultNwbFileView: FunctionComponent<Props> = ({
  width,
  height,
  nwbFile,
}) => {
  const rootGroup = useGroup(nwbFile, "/");
  const processingGroup = useGroup(nwbFile, "/processing");
  const includeStimulus = useIncludeStimulus(nwbFile);
  const includeUnits = useIncludeUnits(nwbFile);
  const headings = useMemo(() => {
    const hh: Heading[] = [];
    hh.push({
      name: "acquisition",
      label: "acquisition",
      groupPath: "/acquisition",
    });
    if (processingGroup) {
      processingGroup.subgroups.forEach((sg) => {
        hh.push({
          name: `processing/${sg.name}`,
          label: `processing/${sg.name}`,
          groupPath: `/processing/${sg.name}`,
        });
      });
    } else {
      hh.push({
        name: "loading-processing",
        label: "loading processing...",
        groupPath: "",
      });
    }
    if (includeUnits) {
      hh.push({
        name: "units",
        label: "units",
        groupPath: "/units",
      });
    }
    if (rootGroup) {
      for (const sg of rootGroup.subgroups) {
        if (sg.name === "processing") {
          // we already took care of processing above
          continue;
        }
        if (sg.name === "specifications") {
          // do not include specifications in the top level headings
          continue;
        }
        if (sg.name === "general") {
          // do not include general in the top level headings
          continue;
        }
        if (sg.name === "units") {
          // already handled units above
          continue;
        }
        if (sg.name === "stimulus") {
          // only include stimulus if there is something in it besides empty groups
          if (!includeStimulus) {
            continue;
          }
        }
        if (!hh.find((h) => h.groupPath === sg.path)) {
          hh.push({
            name: sg.name,
            label: sg.name,
            groupPath: sg.path,
          });
        }
      }
    }
    hh.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return hh;
  }, [processingGroup, rootGroup, includeStimulus, includeUnits]);
  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      {/* <DendroLinksView /> */}
      {headings.map((heading) => (
        <TopLevelHeadingView
          key={heading.name}
          nwbFile={nwbFile}
          heading={heading}
          width={width}
        />
      ))}
    </div>
  );
};

const useIncludeStimulus = (nwbFile: RemoteH5FileX) => {
  const [includeStimulus, setIncludeStimulus] = useState<boolean | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const group = await nwbFile.getGroup("/stimulus");
      if (canceled) return;
      if (!group) {
        setIncludeStimulus(false);
        return;
      }
      let foundSomething = false;
      for (const sg of group.subgroups) {
        const subgroup = await nwbFile.getGroup(sg.path);
        if (
          subgroup &&
          (subgroup.subgroups.length > 0 || subgroup.datasets.length > 0)
        ) {
          foundSomething = true;
          break;
        }
      }
      if (canceled) return;
      setIncludeStimulus(foundSomething);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  return includeStimulus;
};

const useIncludeUnits = (nwbFile: RemoteH5FileX) => {
  const [includeUnits, setIncludeUnits] = useState<boolean | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const group = await nwbFile.getGroup("/units");
      if (canceled) return;
      if (!group) {
        setIncludeUnits(false);
        return;
      }
      if (group.datasets.length > 0) {
        if (canceled) return;
        setIncludeUnits(true);
        return;
      }
      let foundSomething = false;
      for (const sg of group.subgroups) {
        const subgroup = await nwbFile.getGroup(sg.path);
        if (
          subgroup &&
          (subgroup.subgroups.length > 0 || subgroup.datasets.length > 0)
        ) {
          foundSomething = true;
          break;
        }
      }
      if (canceled) return;
      setIncludeUnits(foundSomething);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  return includeUnits;
};

type TopLevelHeadingViewProps = {
  nwbFile: RemoteH5FileX;
  heading: Heading;
  width: number;
};

const TopLevelHeadingView: FunctionComponent<TopLevelHeadingViewProps> = ({
  nwbFile,
  heading,
  width,
}) => {
  const [expanded, setExpanded] = useState(false);
  const group = useGroup(nwbFile, heading.groupPath);
  // const titlePanelColor = expanded ? '#336' : '#669'
  const titlePanelColor = expanded ? "#a67c00" : "#feb";
  const titleColor = expanded ? "#feb" : "#865c00";
  const expandable =
    !!heading.groupPath &&
    group &&
    group.subgroups.length + group.datasets.length > 0;
  return (
    <div style={{ marginLeft: 10, userSelect: "none" }}>
      <div
        style={{
          cursor: "pointer",
          paddingTop: 10,
          paddingBottom: 10,
          marginTop: 10,
          background: titlePanelColor,
          color: titleColor,
          border: "solid 1px black",
        }}
        onClick={() => expandable && setExpanded(!expanded)}
      >
        {expandable ? expanded ? "▼" : "►" : <span>&nbsp;&nbsp;&nbsp;</span>}{" "}
        {heading.label}{" "}
        <TopLevelTitlePanelText
          heading={heading}
          group={group}
          nwbFile={nwbFile}
        />
      </div>
      {expanded && group && (
        <TopLevelContentPanel
          heading={heading}
          group={group}
          nwbFile={nwbFile}
          width={width - 25}
        />
      )}
    </div>
  );
};

type TopLevelTitlePanelTextProps = {
  heading: Heading;
  group: RemoteH5Group | undefined;
  nwbFile: RemoteH5FileX;
};

const TopLevelTitlePanelText: FunctionComponent<
  TopLevelTitlePanelTextProps
> = ({ heading, group, nwbFile }) => {
  if (!group) return <span>-</span>;
  if (heading.name === "units") {
    return (
      <UnitsTitlePanelText heading={heading} group={group} nwbFile={nwbFile} />
    );
  } else {
    return <span>({group.subgroups.length + group.datasets.length})</span>;
  }
};

const UnitsTitlePanelText: FunctionComponent<TopLevelTitlePanelTextProps> = ({
  group,
  nwbFile,
}) => {
  const [numUnits, setNumUnits] = useState<number | undefined>(undefined);
  useEffect(() => {
    if (!group) return;
    if (group.datasets.filter((ds) => ds.name === "id").length === 0) return;
    let canceled = false;
    const load = async () => {
      const ids = await nwbFile.getDatasetData(`${group.path}/id`, {});
      if (canceled) return;
      if (!ids) return;
      setNumUnits(ids.length);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [group, nwbFile]);
  if (numUnits === undefined) return <span>...</span>;
  return <span>({numUnits} units)</span>;
};

type TopLevelContentPanelProps = {
  heading: Heading;
  group: RemoteH5Group;
  nwbFile: RemoteH5FileX;
  width: number;
};

const TopLevelContentPanel: FunctionComponent<TopLevelContentPanelProps> = ({
  heading,
  group,
  nwbFile,
  width,
}) => {
  const name = heading.name;
  if (name === "units") {
    return <UnitsContentPanel nwbFile={nwbFile} group={group} width={width} />;
  } else if (name === "acquisition") {
    return (
      <ProcessingGroupContentPanel
        nwbFile={nwbFile}
        groupPath={heading.groupPath}
      />
    );
  } else if (name.startsWith("processing/")) {
    return (
      <ProcessingGroupContentPanel
        nwbFile={nwbFile}
        groupPath={heading.groupPath}
      />
    );
  } else if (name === "intervals") {
    return <IntervalsContentPanel nwbFile={nwbFile} group={group} />;
  }
  return (
    <TopLevelGroupContentPanel name={name} group={group} nwbFile={nwbFile} />
  );
};

export default DefaultNwbFileView;
