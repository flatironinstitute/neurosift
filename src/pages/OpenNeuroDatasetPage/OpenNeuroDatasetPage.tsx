import { FunctionComponent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ScrollY from "../../components/ScrollY";
import { Box, Typography } from "@mui/material";
import { formatBytes } from "../util/formatBytes";
import SessionsBrowser from "./SessionsBrowser";
import { addRecentOpenNeuroDataset } from "../util/recentOpenNeuroDatasets";

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
    files: {
      id: string;
      key: string;
      filename: string;
      size: number;
      directory: boolean;
      urls: string[];
    }[];
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
  const navigate = useNavigate();
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

  const { snapshot } = datasetInfo;
  const nonDirectoryFiles = snapshot.files.filter((f) => !f.directory);

  return (
    <ScrollY width={width} height={height}>
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <span
            onClick={() => navigate("/openneuro")}
            style={{
              cursor: "pointer",
              color: "#0066cc",
              fontSize: "14px",
            }}
          >
            ← Back to OpenNeuro
          </span>
        </div>
        <Box
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: "warning.light",
            borderRadius: 1,
            color: "warning.dark",
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: "medium" }}>
            🚧 This page is currently under development. Functionality is
            limited at this time. 🚧
          </Typography>
        </Box>
        <h1>{snapshot.description.Name}</h1>

        <div style={{ marginTop: "15px" }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              color: "#666",
            }}
          >
            <span>ID: {datasetInfo.id}</span>
            <span>Version: {snapshot.tag}</span>
            <span>
              Created: {new Date(snapshot.created).toLocaleDateString()}
            </span>
            <span>
              Views: {snapshot.analytics.views} | Downloads:{" "}
              {snapshot.analytics.downloads}
            </span>
            <a
              href={`https://openneuro.org/datasets/${datasetInfo.id}/versions/${snapshot.tag}`}
              style={{ color: "#0066cc", textDecoration: "none" }}
            >
              View on OpenNeuro
            </a>
          </div>
        </div>

        {snapshot.description.DatasetDOI && (
          <div style={{ marginTop: "15px" }}>
            <strong>DOI: </strong>
            {snapshot.description.DatasetDOI}
          </div>
        )}

        <div style={{ marginTop: "15px" }}>
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <strong>Authors:</strong>
            {snapshot.description.Authors.map((author, index) => (
              <span key={index}>
                {author}
                {index < snapshot.description.Authors.length - 1 && ", "}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "20px" }}>
          <h2>Files</h2>
          <div style={{ marginBottom: "10px" }}>
            Total files: {snapshot.summary.totalFiles}
            {" | "}
            Total size: {formatBytes(snapshot.size)}
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "#f5f5f5",
                  borderBottom: "1px solid #ccc",
                }}
              >
                <th style={{ padding: "8px", textAlign: "left" }}>File Path</th>
                <th
                  style={{
                    padding: "8px",
                    textAlign: "right",
                    width: "100px",
                  }}
                >
                  Size
                </th>
              </tr>
            </thead>
            <tbody>
              {nonDirectoryFiles
                .sort((a, b) => a.filename.localeCompare(b.filename))
                .map((file) => (
                  <tr key={file.id} style={{ borderBottom: "1px solid #ccc" }}>
                    <td style={{ padding: "8px" }}>
                      <div
                        style={{
                          cursor: file.filename.endsWith(".nwb")
                            ? "pointer"
                            : "default",
                          color: file.filename.endsWith(".nwb")
                            ? "#0066cc"
                            : "inherit",
                        }}
                        onClick={() => {
                          if (file.filename.endsWith(".nwb")) {
                            navigate(
                              `/nwb?url=${encodeURIComponent(file.urls[0])}&openNeuroDatasetId=${datasetInfo.id}&openNeuroVersion=${snapshot.tag}`,
                            );
                          }
                        }}
                      >
                        {file.filename}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatBytes(file.size)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <SessionsBrowser
          datasetId={datasetInfo.id}
          snapshotTag={snapshot.tag}
        />

        {snapshot.description.License && (
          <div style={{ marginTop: "20px" }}>
            <h3>License</h3>
            <p>{snapshot.description.License}</p>
          </div>
        )}

        {snapshot.description.Acknowledgements && (
          <div style={{ marginTop: "20px" }}>
            <h3>Acknowledgements</h3>
            <p>{snapshot.description.Acknowledgements}</p>
          </div>
        )}

        {snapshot.description.Funding && (
          <div style={{ marginTop: "20px" }}>
            <h3>Funding</h3>
            <p>{snapshot.description.Funding}</p>
          </div>
        )}

        {snapshot.description.ReferencesAndLinks &&
          snapshot.description.ReferencesAndLinks.length > 0 && (
            <div style={{ marginTop: "20px" }}>
              <h3>References and Links</h3>
              <ul>
                {snapshot.description.ReferencesAndLinks.map((ref, index) => (
                  <li key={index}>{ref}</li>
                ))}
              </ul>
            </div>
          )}
      </div>
    </ScrollY>
  );
};

export default OpenNeuroDatasetPage;
