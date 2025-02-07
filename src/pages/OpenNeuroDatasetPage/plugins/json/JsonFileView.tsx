import { Box, Typography } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import { OpenNeuroPluginProps } from "../pluginInterface";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

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
        borderRadius: 1,
        overflow: "auto",
      }}
    >
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: 8,
          fontSize: "14px",
        }}
      >
        {JSON.stringify(jsonContent, null, 2)}
      </SyntaxHighlighter>
    </Box>
  );
};

export default JsonFileView;
