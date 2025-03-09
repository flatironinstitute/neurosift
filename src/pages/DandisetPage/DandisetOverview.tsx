/* eslint-disable @typescript-eslint/no-explicit-any */
import ScrollY from "@components/ScrollY";
import { MenuBook } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { formatBytes } from "@shared/util/formatBytes";
import { FunctionComponent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";
import DandisetAnnotations from "./components/DandisetAnnotations";

type DandisetOverviewProps = {
  width: number;
  height: number;
  dandisetVersionInfo: DandisetVersionInfo;
};

const findNotebookUrls = (annotations: any[]): string[] => {
  const notebookNotes =
    annotations?.filter((note) => note.tags?.includes("notebook")) || [];

  return notebookNotes
    .map((note) => {
      const firstLine = note.data.content.split("\n")[0].trim();
      return firstLine.startsWith("http") ? firstLine : undefined;
    })
    .filter((url): url is string => url !== undefined);
};

const DandisetOverview: FunctionComponent<DandisetOverviewProps> = ({
  width,
  height,
  dandisetVersionInfo,
}) => {
  const [notebookUrls, setNotebookUrls] = useState<string[]>([]);

  const handleAnnotationsUpdate = useCallback((annotations: any[]) => {
    const urls = findNotebookUrls(annotations);
    setNotebookUrls(urls);
  }, []);
  const navigate = useNavigate();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [contributorsExpanded, setContributorsExpanded] = useState(false);

  const abbreviatedDescriptionLength = 600;
  const abbreviatedContributorsLength = 200;
  const hasLongDescription =
    dandisetVersionInfo.metadata.description?.length >
    abbreviatedDescriptionLength;
  const contributorsText =
    dandisetVersionInfo.metadata.contributor?.map((c) => c.name).join(" • ") ??
    "";
  const hasLongContributors =
    contributorsText.length > abbreviatedContributorsLength;

  return (
    <ScrollY width={width} height={height}>
      <div style={{ padding: "15px" }}>
        {/* Back to DANDI */}
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

        {/* Name */}
        <Typography variant="h6" gutterBottom>
          {dandisetVersionInfo.metadata.name}
        </Typography>

        {/* View on DANDI and Notebooks */}
        <Box sx={{ mt: 2, display: "flex", alignItems: "center", gap: 2 }}>
          <a
            href={`https://dandiarchive.org/dandiset/${dandisetVersionInfo.dandiset.identifier}/${dandisetVersionInfo.version}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc", textDecoration: "none" }}
          >
            View on DANDI →
          </a>
          {notebookUrls.map((url) => (
            <Tooltip key={url} title={`Open notebook at ${url}`}>
              <IconButton
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                color="primary"
              >
                <MenuBook />
              </IconButton>
            </Tooltip>
          ))}
        </Box>

        {/* Description */}
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

        {/* Contributors */}
        {dandisetVersionInfo.metadata.contributor && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Contributors
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              <div>
                {contributorsExpanded
                  ? contributorsText
                  : hasLongContributors
                    ? contributorsText.slice(0, abbreviatedContributorsLength) +
                      "... "
                    : contributorsText}
                {hasLongContributors && (
                  <span
                    onClick={() =>
                      setContributorsExpanded(!contributorsExpanded)
                    }
                    style={{ color: "#0066cc", cursor: "pointer" }}
                  >
                    {contributorsExpanded ? "show less" : "read more"}
                  </span>
                )}
              </div>
            </Box>
          </Box>
        )}

        {/* Dataset information */}
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
            <div>
              Modified:{" "}
              {new Date(dandisetVersionInfo.modified).toLocaleDateString()}
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
              Number of Subjects:{" "}
              {dandisetVersionInfo.metadata.assetsSummary.numberOfSubjects}
            </div>
          </Box>
        </Box>

        {/* License and Citation */}
        {(dandisetVersionInfo.metadata.license?.length > 0 ||
          dandisetVersionInfo.metadata.citation) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              License and Citation
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {dandisetVersionInfo.metadata.license?.length > 0 && (
                <div>
                  License: {dandisetVersionInfo.metadata.license.join(", ")}
                </div>
              )}
              {dandisetVersionInfo.metadata.citation && (
                <div style={{ marginTop: "8px" }}>
                  <div>Citation:</div>
                  <div
                    style={{
                      marginLeft: "8px",
                      marginTop: "4px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {dandisetVersionInfo.metadata.citation}
                  </div>
                </div>
              )}
            </Box>
          </Box>
        )}

        {/* Keywords */}
        {dandisetVersionInfo.metadata.keywords?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Keywords
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {dandisetVersionInfo.metadata.keywords.join(", ")}
            </Box>
          </Box>
        )}

        {/* Species */}
        {dandisetVersionInfo.metadata.assetsSummary.species?.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Species
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {dandisetVersionInfo.metadata.assetsSummary.species.map(
                (s, i) => (
                  <div key={i}>{s.name}</div>
                ),
              )}
            </Box>
          </Box>
        )}

        {/* Research Methods */}
        {(dandisetVersionInfo.metadata.assetsSummary.approach?.length > 0 ||
          dandisetVersionInfo.metadata.assetsSummary.measurementTechnique
            ?.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Research Methods
            </Typography>
            <Box sx={{ ml: 1, mt: 1 }}>
              {dandisetVersionInfo.metadata.assetsSummary.approach?.map(
                (a, i) => <div key={i}>Approach: {a.name}</div>,
              )}
              {dandisetVersionInfo.metadata.assetsSummary.measurementTechnique?.map(
                (t, i) => <div key={i}>Technique: {t.name}</div>,
              )}
            </Box>
          </Box>
        )}

        {/* Notes */}
        <DandisetAnnotations
          dandisetId={dandisetVersionInfo.dandiset.identifier}
          onAnnotationsUpdate={handleAnnotationsUpdate}
        />
      </div>
    </ScrollY>
  );
};

export default DandisetOverview;
