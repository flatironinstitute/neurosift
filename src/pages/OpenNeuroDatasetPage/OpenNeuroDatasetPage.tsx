import { FunctionComponent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "../../components/ResponsiveLayout";
import { addRecentOpenNeuroDataset } from "../util/recentOpenNeuroDatasets";
import OpenNeuroDatasetOverview from "./components/OpenNeuroDatasetOverview";
import OpenNeuroDatasetWorkspace from "./components/OpenNeuroDatasetWorkspace";
import { OpenNeuroFile } from "./plugins/pluginInterface";

type OpenNeuroDatasetPageProps = {
  width: number;
  height: number;
};

type OpenNeuroDatasetInfo = {
  id: string;
  created: string;
  snapshot: {
    id: string;
    tag: string;
    created: string;
    size: number;
    description: {
      Name: string;
      Authors: string[];
      DatasetDOI?: string;
      License?: string;
      Acknowledgements?: string;
      Funding?: string;
      ReferencesAndLinks?: string[];
    };
    files: OpenNeuroFile[];
    summary: {
      modalities: string[];
      sessions: string[];
      subjects: string[];
      totalFiles: number;
    };
    analytics: {
      downloads: number;
      views: number;
    };
  };
};

const fetchDatasetInfo = async (
  datasetId: string,
  tag?: string,
): Promise<OpenNeuroDatasetInfo> => {
  const query = `query snapshot($datasetId: ID!, $tag: String!) {
        snapshot(datasetId: $datasetId, tag: $tag) {
            id
            tag
            created
            size
            description {
                Name
                Authors
                DatasetDOI
                License
                Acknowledgements
                Funding
                ReferencesAndLinks
            }
            files {
                id
                key
                filename
                size
                directory
                urls
            }
            summary {
                modalities
                sessions
                subjects
                totalFiles
            }
            analytics {
                downloads
                views
            }
        }
    }`
    .split("\n")
    .join("\\n");

  // If no tag provided, fetch latest snapshot tag first
  if (!tag) {
    type Snapshot = {
      id: string;
      created: string;
      tag: string;
    };

    const tagQuery = `query dataset($datasetId: ID!) {
            dataset(id: $datasetId) {
                id
                snapshots {
                    id
                    created
                    tag
                }
            }
        }`
      .split("\n")
      .join("\\n");

    const tagResp = await fetch("https://openneuro.org/crn/graphql", {
      headers: { "content-type": "application/json" },
      body: `{"operationName":"dataset","variables":{"datasetId":"${datasetId}"},"query":"${tagQuery}"}`,
      method: "POST",
    });

    if (!tagResp.ok) throw new Error("Failed to fetch OpenNeuro dataset");
    const tagData = await tagResp.json();
    const snapshots = tagData.data.dataset.snapshots;
    if (snapshots.length === 0)
      throw new Error("No snapshots found for dataset");
    tag = snapshots.reduce((a: Snapshot, b: Snapshot) =>
      new Date(a.created) > new Date(b.created) ? a : b,
    ).tag;
  }

  const resp = await fetch("https://openneuro.org/crn/graphql", {
    headers: { "content-type": "application/json" },
    body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${tag}"},"query":"${query}"}`,
    method: "POST",
  });

  if (!resp.ok) throw new Error("Failed to fetch OpenNeuro dataset");
  const data = await resp.json();
  return {
    id: datasetId,
    created: data.data.snapshot.created,
    snapshot: data.data.snapshot,
  };
};

const OpenNeuroDatasetPage: FunctionComponent<OpenNeuroDatasetPageProps> = ({
  width,
  height,
}) => {
  const { datasetId, version } = useParams();
  const [searchParams] = useSearchParams();
  const [datasetInfo, setDatasetInfo] = useState<OpenNeuroDatasetInfo | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const info = await fetchDatasetInfo(datasetId, version);
        setDatasetInfo(info);
        setError(null);
        // Add to recent datasets
        addRecentOpenNeuroDataset(info.id);
      } catch (err) {
        console.error("Error fetching dataset:", err);
        setError(err instanceof Error ? err.message : "Failed to load dataset");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [datasetId, version]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!datasetInfo) return <div>No dataset found</div>;

  const initialSplitterPosition = Math.max(300, Math.min(450, width / 3));
  const tabFilePath = searchParams.get("tab");

  return (
    <ResponsiveLayout
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      mobileBreakpoint={768}
    >
      <OpenNeuroDatasetOverview
        width={0}
        height={0}
        datasetInfo={datasetInfo}
      />
      <OpenNeuroDatasetWorkspace
        width={0}
        height={0}
        topLevelFiles={datasetInfo.snapshot.files.map((f) => ({
          ...f,
          filepath: f.filename,
          parentId: "",
        }))}
        datasetId={datasetInfo.id}
        snapshotTag={datasetInfo.snapshot.tag}
        initialTab={tabFilePath}
      />
    </ResponsiveLayout>
  );
};

export default OpenNeuroDatasetPage;
