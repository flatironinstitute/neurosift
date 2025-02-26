import { FunctionComponent, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { Annotation } from "../common/useResourceAnnotations";

const ANNOTATION_API_BASE_URL =
  "https://neurosift-annotation-manager.vercel.app/api";
const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

type Props = {
  width: number;
  height: number;
};

const AnnotationsPage: FunctionComponent<Props> = ({ width, height }) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchAnnotations = async () => {
    const apiKey = localStorage.getItem("neurosiftApiKey");
    if (!apiKey) return;

    setIsLoading(true);
    setError(null);
    try {
      const userResponse = await fetch(
        `${NSJM_API_BASE_URL}/users/by-api-key`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );

      if (!userResponse.ok) {
        throw new Error("Failed to get user info");
      }

      const { userId } = await userResponse.json();

      const response = await fetch(
        `${ANNOTATION_API_BASE_URL}/annotations?userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch annotations");
      }
      const data = await response.json();
      setAnnotations(data.annotations);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch annotations",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const apiKey = localStorage.getItem("neurosiftApiKey");
    if (!apiKey) return;
    fetchAnnotations();
  }, []);

  if (!localStorage.getItem("neurosiftApiKey")) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Please set your Neurosift API key in the{" "}
          <span
            style={{ cursor: "pointer", textDecoration: "underline" }}
            onClick={() => navigate("/settings")}
          >
            settings page
          </span>{" "}
          to view your annotations.
        </Alert>
      </Box>
    );
  }

  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Your Annotations
        </Typography>

        {isLoading && <div>Loading...</div>}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Content</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {annotations.map((annotation) => (
                <TableRow key={annotation.id} hover>
                  <TableCell>{annotation.title}</TableCell>
                  <TableCell
                    sx={{
                      maxWidth: "300px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {annotation.data.content}
                  </TableCell>
                  <TableCell>{annotation.type}</TableCell>
                  <TableCell>{annotation.targetType}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {annotation.tags.map((tag: string, index: number) => {
                        let chipProps = {};
                        // Check for URL tag in nwb_file annotations
                        if (
                          annotation.targetType === "nwb_file" &&
                          tag.startsWith("url:")
                        ) {
                          const url = tag.slice(4); // Remove "url:" prefix
                          const dandisetTag = annotation.tags.find((t) =>
                            t.startsWith("dandiset:"),
                          );
                          const dandisetId = dandisetTag?.split(":")[1];
                          chipProps = {
                            onClick: () =>
                              navigate(
                                `/nwb?url=${url}${
                                  dandisetId ? `&dandisetId=${dandisetId}` : ""
                                }`,
                              ),
                            clickable: true,
                          };
                        } else if (tag.startsWith("dandiset:")) {
                          const dandisetId = tag.split(":")[1];
                          chipProps = {
                            onClick: () => navigate(`/dandiset/${dandisetId}`),
                            clickable: true,
                          };
                        } else if (tag.startsWith("openneuro:")) {
                          const datasetId = tag.split(":")[1];
                          chipProps = {
                            onClick: () =>
                              navigate(`/openneuro-dataset/${datasetId}`),
                            clickable: true,
                          };
                        }
                        return (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{
                              maxWidth: 150,
                              cursor: Object.prototype.hasOwnProperty.call(
                                chipProps,
                                "onClick",
                              )
                                ? "pointer"
                                : "default",
                            }}
                            {...chipProps}
                          />
                        );
                      })}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {new Date(annotation.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {annotation.updatedAt !== annotation.createdAt
                      ? new Date(annotation.updatedAt).toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>

        {!isLoading && !error && annotations.length === 0 && (
          <Typography align="center" sx={{ mt: 2 }}>
            No annotations found.
          </Typography>
        )}
      </Box>
    </div>
  );
};

export default AnnotationsPage;
