import { Paper, Typography, Box } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { OpenNeuroDataset } from "./OpenNeuroPage";
import { formatBytes } from "@shared/util/formatBytes";

type Props = {
  dataset: OpenNeuroDataset;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

const OpenNeuroDatasetResult = ({ dataset }: Props) => {
  const name = dataset.latestSnapshot?.description?.Name || "Untitled Dataset";

  return (
    <Paper
      sx={{
        position: "relative",
        p: 3,
        mb: 2.5,
        borderRadius: 3,
        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
        "&:hover": {
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          transform: "translateY(-2px)",
          transition: "all 0.2s ease-in-out",
        },
      }}
    >
      <Box
        component={RouterLink}
        to={`/openneuro-dataset/${dataset.id}`}
        aria-label={name}
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          borderRadius: "inherit",
        }}
      />
      <Typography variant="h6" gutterBottom>
        {name}
      </Typography>
      <Box sx={{ display: "flex", gap: 4, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          ID: {dataset.id}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Created: {formatDate(dataset.created)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Uploader: {dataset.uploader.name}
        </Typography>
      </Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2">
          Authors: {dataset.latestSnapshot?.description?.Authors?.join(", ")}
        </Typography>
      </Box>
      {dataset.latestSnapshot && (
        <Box sx={{ display: "flex", gap: 4 }}>
          <Typography variant="body2">
            Files: {dataset.latestSnapshot.summary?.totalFiles}
          </Typography>
          <Typography variant="body2">
            Size: {formatBytes(dataset.latestSnapshot.size)}
          </Typography>
          <Typography variant="body2">
            Views: {dataset.analytics.views}
          </Typography>
          <Typography variant="body2">
            Downloads: {dataset.analytics.downloads}
          </Typography>
        </Box>
      )}
      {!dataset.public && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
          Status: Private
        </Typography>
      )}
    </Paper>
  );
};

export default OpenNeuroDatasetResult;
