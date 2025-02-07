import { Box, Button, Typography, CircularProgress } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { FunctionComponent, useEffect, useState, useMemo } from "react";
import { OpenNeuroPluginProps } from "../pluginInterface";
import TsvTable from "./components/Table";

const TsvView: FunctionComponent<OpenNeuroPluginProps> = ({ file }) => {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    const fetchTsv = async () => {
      try {
        setLoading(true);
        const response = await fetch(file.urls[0]);
        if (!response.ok) {
          throw new Error("Failed to fetch TSV content");
        }
        const data = await response.text();
        setContent(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching TSV:", err);
        setError(err instanceof Error ? err.message : "Failed to load TSV");
      } finally {
        setLoading(false);
      }
    };

    fetchTsv();
  }, [file.urls]);

  const { headers, rows } = useMemo(() => {
    if (!content) return { headers: [], rows: [] };

    try {
      const lines = content.trim().split("\n");
      if (lines.length === 0) {
        throw new Error("Empty TSV file");
      }

      const headers = lines[0].split("\t");
      const rows = lines.slice(1).map((line) => line.split("\t"));

      // Validate that all rows have the same number of columns
      const headerCount = headers.length;
      const invalidRow = rows.find((row) => row.length !== headerCount);
      if (invalidRow) {
        throw new Error("Malformed TSV: Inconsistent number of columns");
      }

      return { headers, rows };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse TSV");
      return { headers: [], rows: [] };
    }
  }, [content]);

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
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
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <Button
          startIcon={<ContentCopyIcon />}
          onClick={handleCopy}
          variant="outlined"
          size="small"
          color={copySuccess ? "success" : "primary"}
        >
          {copySuccess ? "Copied!" : "Copy to Clipboard"}
        </Button>
      </Box>
      {headers.length > 0 && rows.length > 0 ? (
        <TsvTable headers={headers} rows={rows} />
      ) : (
        <Typography>No data available</Typography>
      )}
    </Box>
  );
};

export default TsvView;
