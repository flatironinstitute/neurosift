/* eslint-disable @typescript-eslint/no-explicit-any */
import ScrollY from "@components/ScrollY";
import { ChatBubble, MenuBook } from "@mui/icons-material";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { formatBytes } from "@shared/util/formatBytes";
import { FunctionComponent, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DandisetVersionInfo } from "../DandiPage/dandi-types";
import DandisetAnnotations from "./components/DandisetAnnotations";
import { Annotation } from "../common/useResourceAnnotations";

interface NotebookInfo {
  annotation: Annotation;
  url: string;
}

type DandisetOverviewProps = {
  width: number;
  height: number;
  dandisetVersionInfo: DandisetVersionInfo;
};

const findNotebookInfos = (annotations: any[]): NotebookInfo[] => {
  const notebookAnnotations: Annotation[] =
    annotations?.filter((note) => note.tags?.includes("notebook")) || [];

  return notebookAnnotations
    .map((annotation) => {
      const lines = annotation.data.content.split("\n");
      const url = lines[0].trim();
      if (!url.startsWith("http")) return undefined;
      return {
        annotation,
        url: url,
      };
    })
    .filter((notebookInfo) => notebookInfo !== undefined) as NotebookInfo[];
};

type ChatInfo = {
  annotation: Annotation;
  url: string;
};

const findChatInfos = (annotations: any[]): ChatInfo[] => {
  const chatAnnotations: Annotation[] =
    annotations?.filter((note) => note.tags?.includes("chat")) || [];

  return chatAnnotations
    .map((annotation) => {
      const lines = annotation.data.content.split("\n");
      const url = lines[0].trim();
      if (!url.startsWith("http")) return undefined;
      return {
        annotation,
        url: url,
      };
    })
    .filter((chatInfo) => chatInfo !== undefined) as ChatInfo[];
};

const DandisetOverview: FunctionComponent<DandisetOverviewProps> = ({
  width,
  height,
  dandisetVersionInfo,
}) => {
  const [notebooks, setNotebooks] = useState<NotebookInfo[]>([]);
  const [showNotebooksTable, setShowNotebooksTable] = useState(false);

  const [chats, setChats] = useState<ChatInfo[]>([]);
  const [showChatsTable, setShowChatsTable] = useState(false);

  const handleNoteAnnotationsUpdate = useCallback((annotations: any[]) => {
    const notebookInfo = findNotebookInfos(annotations);
    setNotebooks(notebookInfo);
    const chatInfo = findChatInfos(annotations);
    setChats(chatInfo);
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

        {/* View on DANDI */}
        <Box sx={{ mt: 2, display: "flex", alignItems: "center" }}>
          <a
            href={`https://dandiarchive.org/dandiset/${dandisetVersionInfo.dandiset.identifier}/${dandisetVersionInfo.version}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#0066cc", textDecoration: "none" }}
          >
            View on DANDI →
          </a>
        </Box>

        {/* Notebooks */}
        {notebooks.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Notebooks
              </Typography>
              <Tooltip
                title={showNotebooksTable ? "Hide notebooks" : "Show notebooks"}
              >
                <IconButton
                  onClick={() => setShowNotebooksTable(!showNotebooksTable)}
                  size="small"
                  color="primary"
                >
                  <MenuBook />
                </IconButton>
              </Tooltip>
            </Box>
            {showNotebooksTable && (
              <Box sx={{ ml: 1, mt: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ccc" }}>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Title
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Date
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        NBFiddle
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {notebooks.map((notebook, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "8px" }}>
                          <a
                            href={notebook.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0066cc", textDecoration: "none" }}
                          >
                            {notebook.annotation.title}
                          </a>
                        </td>
                        <td style={{ padding: "8px" }}>
                          {new Date(
                            notebook.annotation.updatedAt,
                          ).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "8px" }}>
                          <a href={`https://nbfiddle.app/?url=${notebook.url}`}>
                            nbfiddle
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}

        {/* Chats */}
        {chats.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="subtitle2" color="text.secondary">
                Chats
              </Typography>
              <Tooltip title={showChatsTable ? "Hide chats" : "Show chats"}>
                <IconButton
                  onClick={() => setShowChatsTable(!showChatsTable)}
                  size="small"
                  color="primary"
                >
                  <ChatBubble />
                </IconButton>
              </Tooltip>
            </Box>
            {showChatsTable && (
              <Box sx={{ ml: 1, mt: 1 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ccc" }}>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Title
                      </th>
                      <th style={{ textAlign: "left", padding: "8px" }}>
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chats.map((chat, index) => (
                      <tr
                        key={index}
                        style={{ borderBottom: "1px solid #eee" }}
                      >
                        <td style={{ padding: "8px" }}>
                          <a
                            href={chat.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#0066cc", textDecoration: "none" }}
                          >
                            {chat.annotation.title}
                          </a>
                        </td>
                        <td style={{ padding: "8px" }}>
                          {new Date(
                            chat.annotation.updatedAt,
                          ).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            )}
          </Box>
        )}

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
                // dandisetVersionInfo.metadata.assetsSummary.numberOfBytes,
                dandisetVersionInfo.size,
              )}
            </div>
            <div>
              {/* Files: {dandisetVersionInfo.metadata.assetsSummary.numberOfFiles} */}
              Files: {dandisetVersionInfo.asset_count}
            </div>
            {/* <div>
              Number of Subjects:{" "}
              {dandisetVersionInfo.metadata.assetsSummary.numberOfSubjects}
            </div> */}
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
                (a, i) => (
                  <div key={i}>Approach: {a.name}</div>
                ),
              )}
              {dandisetVersionInfo.metadata.assetsSummary.measurementTechnique?.map(
                (t, i) => (
                  <div key={i}>Technique: {t.name}</div>
                ),
              )}
            </Box>
          </Box>
        )}

        {/* Notes */}
        <DandisetAnnotations
          dandisetId={dandisetVersionInfo.dandiset.identifier}
          onNoteAnnotationsUpdate={handleNoteAnnotationsUpdate}
        />

        {/* Chat (Experimental) */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            <a
              // href={`https://dandi-ai-notebooks.github.io/dandiset-explorer/chat?dandisetId=${dandisetVersionInfo.dandiset.identifier}&dandisetVersion=${dandisetVersionInfo.version}`}
              href={`https://dandiset-explorer.vercel.app/chat?dandisetId=${dandisetVersionInfo.dandiset.identifier}&dandisetVersion=${dandisetVersionInfo.version}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#0066cc", textDecoration: "none" }}
            >
              Chat (Experimental)
            </a>
          </Typography>
        </Box>
      </div>
    </ScrollY>
  );
};

export default DandisetOverview;
