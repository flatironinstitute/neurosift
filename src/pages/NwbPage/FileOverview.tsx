import {
  Badge,
  Disclosure,
  LoadingState,
  OverviewPanel,
  Select,
  type Description,
} from "@ui";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";
import DatasetDataView from "./DatasetDataView";
import { getLindiUrl, isUsingLindi } from "./hdf5Interface";
import { NwbFileOverview } from "./Types";
import ViewError from "@components/ViewError/ViewError";

type VersionOption = { version: string; label: string };

interface FileOverviewProps {
  nwbUrl: string;
  nwbFileOverview: NwbFileOverview | { error: string } | null;
  dandisetInfo: DandisetVersionInfo | null;
  /** The Dandiset’s page in Neurosift: /dandiset/… or /ember-dandiset/…. */
  dandisetPath: string;
  availableVersions: VersionOption[];
  onVersionChange: (version: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

const PREVIEW = 150;

function LongText({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (text.length <= PREVIEW) return <>{text}</>;
  return (
    <>
      {!open && `${text.slice(0, PREVIEW).trimEnd()}…`}
      <Disclosure
        label={`Show full ${label}`}
        expandedLabel="Show less"
        open={open}
        onToggle={setOpen}
      >
        {text}
      </Disclosure>
    </>
  );
}

/** The file viewer’s overview panel: the Dandiset, the session’s fields, and LINDI. */
export default function FileOverview({
  nwbUrl,
  nwbFileOverview,
  dandisetInfo,
  dandisetPath,
  availableVersions,
  onVersionChange,
  ...panel
}: FileOverviewProps) {
  // Whether LINDI is used is known only once the file starts loading.
  const [, recheck] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => recheck((n) => n + 1), 2000);
    return () => clearTimeout(timer);
  }, [nwbUrl]);
  const groups: { title: string; items: Description[] }[] = [];
  if (dandisetInfo) {
    const id = dandisetInfo.dandiset.identifier;
    groups.push({
      title: "Dandiset",
      items: [
        { term: "ID", value: <Link to={dandisetPath}>{id}</Link>, code: true },
        { term: "Title", value: dandisetInfo.metadata.name },
        {
          term: "Version",
          code: availableVersions.length <= 1,
          value:
            availableVersions.length > 1 ? (
              <Select
                label="Version"
                hideLabel
                size="sm"
                value={dandisetInfo.version}
                onChange={onVersionChange}
                options={availableVersions.map(({ version, label }) => ({
                  value: version,
                  label,
                }))}
              />
            ) : (
              dandisetInfo.version
            ),
        },
        {
          term: "Description",
          value: (
            <LongText
              text={dandisetInfo.metadata.description}
              label="description"
            />
          ),
        },
        {
          term: "Contributors",
          value: (
            <LongText
              text={dandisetInfo.metadata.contributor
                .map((c) => c.name)
                .join(", ")}
              label="contributor list"
            />
          ),
        },
      ],
    });
  }
  if (nwbFileOverview && !("error" in nwbFileOverview))
    groups.push({
      title: "Session",
      items: [
        ...nwbFileOverview.items.map((item) => ({
          term: item.name,
          value: (
            <DatasetDataView
              nwbFile={nwbUrl}
              path={item.path}
              renderer={item.renderer}
            />
          ),
        })),
        { term: "NWB version", value: nwbFileOverview.nwbVersion, code: true },
      ],
    });

  return (
    <OverviewPanel title="Overview" groups={groups} {...panel}>
      {!nwbFileOverview && (
        <LoadingState label="Reading the file overview" phase="loading" />
      )}
      {nwbFileOverview && "error" in nwbFileOverview && (
        <ViewError what="the file overview" error={nwbFileOverview.error} />
      )}
      {isUsingLindi(nwbUrl) && (
        <p className="file-overview-lindi">
          <Badge status="info">Using LINDI</Badge>
          <a href={getLindiUrl(nwbUrl)} download>
            Download the LINDI file
          </a>
        </p>
      )}
    </OverviewPanel>
  );
}
