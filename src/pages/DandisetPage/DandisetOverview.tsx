import { Box, Typography, Collapse, IconButton } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ScrollY from "@components/ScrollY";
import { FunctionComponent, useState } from "react";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";
import { useNavigate } from "react-router-dom";
import { formatBytes } from "@shared/util/formatBytes";

type DandisetOverviewProps = {
  width: number;
  height: number;
  dandisetVersionInfo: DandisetVersionInfo;
  incomplete: boolean;
  numFilesLoaded: number;
};

const DandisetOverview: FunctionComponent<DandisetOverviewProps> = ({
  width,
  height,
  dandisetVersionInfo,
  incomplete,
  numFilesLoaded,
}) => {
  const navigate = useNavigate();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [contributorsExpanded, setContributorsExpanded] = useState(false);

  const abbreviatedDescriptionLength = 600;
  const hasLongDescription =
    dandisetVersionInfo.metadata.description?.length >
    abbreviatedDescriptionLength;
  const initialContributors =
    dandisetVersionInfo.metadata.contributor?.slice(0, 12) ?? [];
  const remainingContributors =
    dandisetVersionInfo.metadata.contributor?.slice(12) ?? [];

  return (
    <ScrollY width={width} height={height}>
      <div style={{ padding: "15px" }}>
        <div style={{ marginBottom: "15px" }}>
          <span
            onClick={() => navigate("/dandi")}
            style={{
              cursor: "pointer",
              color: "#0066cc",
              fontSize: "14px",
            }}
          >
            ← Back to DANDI
          </span>
        </div>

        <Typography variant="h6" gutterBottom>
          {dandisetVersionInfo.metadata.name}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <a
            href={`https://dandiarchive.org/dandiset/${dandisetVersionInfo.dandiset.identifier}/${dandisetVersionInfo.version}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc", textDecoration: "none" }}
          >
            View on DANDI →
          </a>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Dataset Information
          </Typography>
          <Box sx={{ ml: 1, mt: 1 }}>
            <div>ID: {dandisetVersionInfo.dandiset.identifier}</div>
            <div>Version: {dandisetVersionInfo.version}</div>
            <div>
              Created:{" "}
              {new Date(dandisetVersionInfo.created).toLocaleDateString()}
            </div>
            <div>Status: {dandisetVersionInfo.status}</div>
            <div>
              Total Size:{" "}
              {formatBytes(
                dandisetVersionInfo.metadata.assetsSummary.numberOfBytes,
              )}
            </div>
            <div>
              Files: {dandisetVersionInfo.metadata.assetsSummary.numberOfFiles}
            </div>
            <div>
              {numFilesLoaded} files loaded{" "}
              {incomplete && "(showing partial list)"}
            </div>
          </Box>
        </Box>

        {dandisetVersionInfo.metadata.description && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Description
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              <div style={{ whiteSpace: "pre-wrap" }}>
                {descriptionExpanded
                  ? dandisetVersionInfo.metadata.description
                  : hasLongDescription
                    ? dandisetVersionInfo.metadata.description.slice(
                        0,
                        abbreviatedDescriptionLength,
                      ) + "... "
                    : dandisetVersionInfo.metadata.description}
                {hasLongDescription && (
                  <span
                    onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                    style={{ color: "#0066cc", cursor: "pointer" }}
                  >
                    {descriptionExpanded ? "show less" : "read more"}
                  </span>
                )}
              </div>
            </Box>
          </Box>
        )}

        {dandisetVersionInfo.metadata.contributor && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Contributors
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {initialContributors.map((contributor, index) => (
                <div key={index}>{contributor.name}</div>
              ))}
              <Collapse in={contributorsExpanded}>
                {remainingContributors.map((contributor, index) => (
                  <div key={index + 3}>{contributor.name}</div>
                ))}
              </Collapse>
              {remainingContributors.length > 0 && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                    color: "primary.main",
                  }}
                  onClick={() => setContributorsExpanded(!contributorsExpanded)}
                >
                  <Typography variant="body2">
                    {contributorsExpanded
                      ? "Show less"
                      : `Show ${remainingContributors.length} more`}
                  </Typography>
                  <IconButton size="small">
                    {contributorsExpanded ? (
                      <ExpandLessIcon />
                    ) : (
                      <ExpandMoreIcon />
                    )}
                  </IconButton>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </div>
    </ScrollY>
  );
};

export default DandisetOverview;
