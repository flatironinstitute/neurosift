import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import { OpenNeuroDatasetInfo } from "./types";

const GRAPHQL_URL = "https://openneuro.org/crn/graphql";

// The fields we read from OpenNeuro's DatasetFile type. OpenNeuro rejects a
// whole query with a 400 when it names a field the type does not have, so a
// field removed on their side (as "key" was) breaks every query that lists it.
const FILE_FIELDS = "id filename directory size urls";

interface FileResponse {
  id: string;
  filename: string;
  directory: boolean;
  size: number;
  urls: string[];
}

const graphql = async (
  operationName: string,
  variables: Record<string, string>,
  query: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  const resp = await fetch(GRAPHQL_URL, {
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operationName, variables, query }),
    method: "POST",
  });
  if (!resp.ok) {
    // A rejected query comes back with the reason in the body.
    const reason = await resp
      .json()
      .then((body) => body?.errors?.[0]?.message)
      .catch(() => undefined);
    throw new Error(reason ?? `HTTP ${resp.status}`);
  }
  return (await resp.json()).data;
};

const toDatasetFile = (
  f: FileResponse,
  filepath: string,
  parentId: string,
): DatasetFile => ({
  id: f.id,
  // OpenNeuro files have no key separate from their id.
  key: f.id,
  filename: f.filename,
  filepath,
  parentId,
  directory: f.directory,
  size: f.size,
  urls: f.urls,
});

const fetchLatestSnapshotTag = async (datasetId: string): Promise<string> => {
  type Snapshot = { id: string; created: string; tag: string };
  const data = await graphql(
    "dataset",
    { datasetId },
    `
      query dataset($datasetId: ID!) {
        dataset(id: $datasetId) {
          id
          snapshots {
            id
            created
            tag
          }
        }
      }
    `,
  );
  const snapshots: Snapshot[] = data.dataset.snapshots;
  if (snapshots.length === 0) throw new Error("No snapshots found for dataset");
  return snapshots.reduce((a, b) =>
    new Date(a.created) > new Date(b.created) ? a : b,
  ).tag;
};

export const fetchDatasetInfo = async (
  datasetId: string,
  tag?: string,
): Promise<OpenNeuroDatasetInfo> => {
  try {
    const data = await graphql(
      "snapshot",
      { datasetId, tag: tag || (await fetchLatestSnapshotTag(datasetId)) },
      `query snapshot($datasetId: ID!, $tag: String!) {
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
            ${FILE_FIELDS}
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
      }`,
    );
    return {
      id: datasetId,
      created: data.snapshot.created,
      snapshot: {
        ...data.snapshot,
        files: data.snapshot.files.map((f: FileResponse) =>
          toDatasetFile(f, f.filename, ""),
        ),
      },
    };
  } catch (err) {
    throw new Error(
      `Failed to fetch OpenNeuro dataset: ${err instanceof Error ? err.message : err}`,
    );
  }
};

// The files directly inside one directory of a snapshot.
export const fetchDirectoryFiles = async (
  datasetId: string,
  tag: string,
  parent: { id: string; filepath: string },
): Promise<DatasetFile[]> => {
  try {
    const data = await graphql(
      "snapshot",
      { datasetId, tag, tree: parent.id },
      `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
        snapshot(datasetId: $datasetId, tag: $tag) {
          files(tree: $tree) {
            ${FILE_FIELDS}
          }
        }
      }`,
    );
    return data.snapshot.files.map((f: FileResponse) =>
      toDatasetFile(f, parent.filepath + "/" + f.filename, parent.id),
    );
  } catch (err) {
    throw new Error(
      `Failed to fetch OpenNeuro directory: ${err instanceof Error ? err.message : err}`,
    );
  }
};
