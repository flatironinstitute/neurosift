import { Box, Typography } from "@mui/material";
import { FunctionComponent } from "react";
import ScrollY from "../../../components/ScrollY";
import { formatBytes } from "../../util/formatBytes";

interface OpenNeuroDatasetOverviewProps {
  width: number;
  height: number;
  datasetInfo: {
    id: string;
    snapshot: {
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
      analytics: {
        downloads: number;
        views: number;
      };
      summary: {
        modalities: string[];
        sessions: string[];
        subjects: string[];
        totalFiles: number;
      };
    };
  };
}

const OpenNeuroDatasetOverview: FunctionComponent<
  OpenNeuroDatasetOverviewProps
> = ({ width, height, datasetInfo }) => {
  const { snapshot } = datasetInfo;

  return (
    <ScrollY width={width} height={height}>
      <div style={{ padding: "15px" }}>
        <Typography variant="h6" gutterBottom>
          {snapshot.description.Name}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Dataset Information
          </Typography>
          <Box sx={{ ml: 1, mt: 1 }}>
            <div>ID: {datasetInfo.id}</div>
            <div>Version: {snapshot.tag}</div>
            <div>
              Created: {new Date(snapshot.created).toLocaleDateString()}
            </div>
            <div>Total Size: {formatBytes(snapshot.size)}</div>
            <div>Views: {snapshot.analytics.views}</div>
            <div>Downloads: {snapshot.analytics.downloads}</div>
          </Box>
        </Box>

        {snapshot.summary && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Summary
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              <div>Files: {snapshot.summary.totalFiles}</div>
              <div>Subjects: {snapshot.summary.subjects.length}</div>
              <div>Sessions: {snapshot.summary.sessions.length}</div>
              {snapshot.summary.modalities.length > 0 && (
                <div>Modalities: {snapshot.summary.modalities.join(", ")}</div>
              )}
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Authors
          </Typography>
          <Box sx={{ ml: 1, mt: 1 }}>
            {snapshot.description.Authors.map((author, index) => (
              <div key={index}>{author}</div>
            ))}
          </Box>
        </Box>

        {snapshot.description.DatasetDOI && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              DOI
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>{snapshot.description.DatasetDOI}</Box>
          </Box>
        )}

        {snapshot.description.License && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              License
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>{snapshot.description.License}</Box>
          </Box>
        )}

        {snapshot.description.Acknowledgements && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Acknowledgements
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {snapshot.description.Acknowledgements}
            </Box>
          </Box>
        )}

        {snapshot.description.Funding && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Funding
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>{snapshot.description.Funding}</Box>
          </Box>
        )}

        {snapshot.description.ReferencesAndLinks &&
          snapshot.description.ReferencesAndLinks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                References and Links
              </Typography>
              <Box sx={{ ml: 1, mt: 1 }}>
                {snapshot.description.ReferencesAndLinks.map((ref, index) => (
                  <div key={index}>{ref}</div>
                ))}
              </Box>
            </Box>
          )}

        <Box sx={{ mt: 2 }}>
          <a
            href={`https://openneuro.org/datasets/${datasetInfo.id}/versions/${snapshot.tag}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc", textDecoration: "none" }}
          >
            View on OpenNeuro →
          </a>
        </Box>
      </div>
    </ScrollY>
  );
};

export default OpenNeuroDatasetOverview;
