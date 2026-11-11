import { FunctionComponent } from "react";
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
      {...dandisetContent(info)}
      chatHref={`https://dandiset-explorer.neurosift.app/chat?dandisetId=${id}&dandisetVersion=${info.version}`}
    />
  );
};

export default DandisetOverview;
