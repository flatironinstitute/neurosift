import { Box, Typography } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import { OpenNeuroPluginProps } from "../pluginInterface";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

const JsonFileView: FunctionComponent<OpenNeuroPluginProps> = ({ file }) => {
  const [jsonContent, setJsonContent] = useState<JsonValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJson = async () => {
      try {
        setLoading(true);
        const response = await fetch(file.urls[0]);
        if (!response.ok) {
          throw new Error("Failed to fetch JSON content");
        }
        const data = await response.json();
        setJsonContent(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching JSON:", err);
        setError(err instanceof Error ? err.message : "Failed to load JSON");
      } finally {
        setLoading(false);
      }
    };

    fetchJson();
  }, [file.urls]);

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading JSON content...</Typography>
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
        {JSON.stringify(jsonContent, null, 2)}
      </pre>
    </Box>
  );
};

export default JsonFileView;
