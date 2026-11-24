import { FunctionComponent } from "react";
import { useBrainLink } from "@shared/brain/brain";
import { ViewInBrain } from "@shared/brain/ViewInBrain";
import { useChatOpen } from "@shared/chat/chatState";
import DatasetOverview from "../common/DatasetOverview/DatasetOverview";
import { dandisetContent } from "../common/DatasetOverview/dandiOverview";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";

type DandisetOverviewProps = {
  width: number;
  height: number;
  dandisetVersionInfo: DandisetVersionInfo;
  availableVersions?: { version: string; label: string }[];
  onVersionChange?: (version: string) => void;
};

/** A DANDI Dandiset in the shared dataset overview. */
const DandisetOverview: FunctionComponent<DandisetOverviewProps> = ({
  dandisetVersionInfo: info,
  availableVersions,
  onVersionChange,
}) => {
  const id = info.dandiset.identifier;
  // Only for dandisets Neurosift Brain can place in an atlas.
  const brain = useBrainLink(id);
  const [chatOpen, setChatOpen] = useChatOpen();
  return (
    <DatasetOverview
      archive={{ name: "DANDI", href: `${import.meta.env.BASE_URL}dandi` }}
      itemName="Dandiset"
      id={id}
      title={info.metadata.name}
      version={info.version}
      versions={availableVersions?.map(({ version, label }) => ({
        value: version,
        label,
      }))}
      onVersionChange={onVersionChange}
      external={{
        label: "View on DANDI",
        href: `https://dandiarchive.org/dandiset/${id}/${info.version}`,
      }}
      actions={brain && <ViewInBrain href={brain} />}
      {...dandisetContent(info)}
      chat={{ open: chatOpen, onToggle: () => setChatOpen(!chatOpen) }}
    />
  );
};

export default DandisetOverview;
