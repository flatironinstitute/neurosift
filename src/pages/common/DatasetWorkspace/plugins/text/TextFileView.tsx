import { Box, Typography } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import { DatasetPluginProps } from "../pluginInterface";

const TextFileView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchText = async () => {
      try {
        setLoading(true);
        const response = await fetch(file.urls[0]);
        if (!response.ok) {
          throw new Error("Failed to fetch JSON content");
        }
        const data = await response.text();
        setTextContent(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching text:", err);
        setError(err instanceof Error ? err.message : "Failed to load text");
      } finally {
        setLoading(false);
      }
    };

    fetchText();
  }, [file.urls]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading text content...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Error: {error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        backgroundColor: "#f5f5f5",
        borderRadius: 1,
        fontFamily: "monospace",
        overflow: "auto",
      }}
    >
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {textContent}
      </pre>
    </Box>
  );
};

export default TextFileView;
