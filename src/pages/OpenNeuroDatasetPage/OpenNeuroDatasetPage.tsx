/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "@components/ResponsiveLayout";
import { addRecentOpenNeuroDataset } from "../util/recentOpenNeuroDatasets";
import OpenNeuroDatasetOverview from "./OpenNeuroDatasetOverview";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";

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
    files: DatasetFile[];
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

interface FileResponse {
  id: string;
  key: string;
  filename: string;
  directory: boolean;
  size: number;
  urls: string[];
}

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

  const loadFileFromPath = useMemo(
    () =>
      async (
        filePath: string,
        parentId: string,
      ): Promise<DatasetFile | null> => {
        if (!datasetInfo?.snapshot.tag) return null;
        const query =
          `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
      snapshot(datasetId: $datasetId, tag: $tag) {
        files(tree: $tree) {
          id
          key
          filename
          directory
          size
          urls
        }
      }
    }`
            .split("\n")
            .join("\\n");

        try {
          const resp = await fetch("https://openneuro.org/crn/graphql", {
            headers: { "content-type": "application/json" },
            body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${datasetInfo.snapshot.tag}","tree":"${parentId}"},"query":"${query}"}`,
            method: "POST",
          });

          const fileName = filePath.split("/").pop();

          if (!resp.ok) return null;
          const data = await resp.json();
          const files = data.data.snapshot.files;
          const matchingFile = files.find(
            (f: FileResponse) => f.filename === fileName,
          );

          if (!matchingFile) return null;

          return {
            id: matchingFile.id,
            key: matchingFile.key,
            filepath: filePath,
            parentId,
            filename: matchingFile.filename,
            directory: matchingFile.directory,
            size: matchingFile.size,
            urls: matchingFile.urls,
          };
        } catch (error) {
          console.error("Error loading file:", error);
          return null;
        }
      },
    [datasetId, datasetInfo?.snapshot.tag],
  );

  const fetchDirectory = useMemo(
    () =>
      async (parent: DatasetFile): Promise<DatasetFile[]> => {
        const snapshotTag = datasetInfo?.snapshot.tag;
        if (!snapshotTag) return [];
        const query =
          `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
      snapshot(datasetId: $datasetId, tag: $tag) {
        files(tree: $tree) {
          id
          key
          filename
          directory
          size
          urls
        }
      }
    }`
            .split("\n")
            .join("\\n");

        const resp = await fetch("https://openneuro.org/crn/graphql", {
          headers: { "content-type": "application/json" },
          body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}","tree":"${parent.id}"},"query":"${query}"}`,
          method: "POST",
        });

        if (!resp.ok) throw new Error("Failed to fetch OpenNeuro directory");
        const data = await resp.json();
        return data.data.snapshot.files.map((a: any) => ({
          id: a.id,
          key: a.key,
          filepath: parent.filepath + "/" + a.filename,
          filename: a.filename,
          parentId: parent.id,
          directory: a.directory,
          size: a.size,
          urls: a.urls,
        }));
      },
    [datasetId, datasetInfo?.snapshot.tag],
  );

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
      <DatasetWorkspace
        width={0}
        height={0}
        topLevelFiles={datasetInfo.snapshot.files.map((f) => ({
          ...f,
          filepath: f.filename,
          parentId: "",
        }))}
        initialTab={tabFilePath}
        loadFileFromPath={loadFileFromPath}
        fetchDirectory={fetchDirectory}
      />
    </ResponsiveLayout>
  );
};

export default OpenNeuroDatasetPage;
