import { Paper, Typography, Box } from "@mui/material";
import { DandisetSearchResultItem } from "./dandi-types";
import { useNavigate } from "react-router-dom";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

import { formatBytes } from "@shared/util/formatBytes";

type Props = {
  dandiset: DandisetSearchResultItem;
};

const DandisetSearchResult = ({ dandiset }: Props) => {
  const navigate = useNavigate();
  const version =
    dandiset.most_recent_published_version || dandiset.draft_version;

  return (
    <Paper
      sx={{
        p: 3,
        mb: 2.5,
        borderRadius: 3,
        boxShadow: "0 3px 10px rgba(0,0,0,0.08)",
        cursor: "pointer",
        "&:hover": {
          boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
          transform: "translateY(-2px)",
          transition: "all 0.2s ease-in-out",
        },
      }}
      onClick={() => navigate(`/dandiset/${dandiset.identifier}`)}
    >
      <Typography variant="h6" gutterBottom>
        {version?.name || "Untitled Dataset"}
      </Typography>
      <Box sx={{ display: "flex", gap: 4, mb: 1 }}>
        <Typography variant="body2" color="text.secondary">
          ID: {dandiset.identifier}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Created: {formatDate(dandiset.created)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Modified: {formatDate(dandiset.modified)}
        </Typography>
      </Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="body2">
          Contact: {dandiset.contact_person}
        </Typography>
      </Box>
      {version && (
        <Box sx={{ display: "flex", gap: 4 }}>
          <Typography variant="body2">Version: {version.version}</Typography>
          <Typography variant="body2">Files: {version.asset_count}</Typography>
          <Typography variant="body2">
            Size: {formatBytes(version.size)}
          </Typography>
        </Box>
      )}
      {dandiset.embargo_status !== "OPEN" && (
        <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
          Status: {dandiset.embargo_status}
        </Typography>
      )}
    </Paper>
  );
};

export default DandisetSearchResult;
