import { Box, Typography, TextField, Paper, Alert } from "@mui/material";
import { FunctionComponent, useState, useEffect } from "react";

type SettingsPageProps = {
  width: number;
  height: number;
};

const SettingsPage: FunctionComponent<SettingsPageProps> = ({
  width,
  height,
}) => {
  const [dandiApiKey, setDandiApiKey] = useState("");
  const [dandiStagingApiKey, setDandiStagingApiKey] = useState("");
  const [emberApiKey, setEmberApiKey] = useState("");
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  useEffect(() => {
    // Load initial values from localStorage
    const savedDandiApiKey = localStorage.getItem("dandiApiKey") || "";
    const savedDandiStagingApiKey =
      localStorage.getItem("dandiStagingApiKey") || "";
    const savedEmberApiKey = localStorage.getItem("emberApiKey") || "";
    setDandiApiKey(savedDandiApiKey);
    setDandiStagingApiKey(savedDandiStagingApiKey);
    setEmberApiKey(savedEmberApiKey);
  }, []);

  const handleDandiApiKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newKey = event.target.value;
    setDandiApiKey(newKey);
    localStorage.setItem("dandiApiKey", newKey);
    setShowSaveNotification(true);
  };

  const handleDandiStagingApiKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newKey = event.target.value;
    setDandiStagingApiKey(newKey);
    localStorage.setItem("dandiStagingApiKey", newKey);
    setShowSaveNotification(true);
  };

  const handleEmberApiKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newKey = event.target.value;
    setEmberApiKey(newKey);
    localStorage.setItem("emberApiKey", newKey);
    setShowSaveNotification(true);
  };

  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            DANDI API Keys
          </Typography>
          <TextField
            fullWidth
            label="DANDI API Key"
            variant="outlined"
            value={dandiApiKey}
            onChange={handleDandiApiKeyChange}
            margin="normal"
            type="password"
            helperText="Enter your DANDI API key for accessing protected resources on api.dandiarchive.org"
          />
          <TextField
            fullWidth
            label="DANDI Staging API Key"
            variant="outlined"
            value={dandiStagingApiKey}
            onChange={handleDandiStagingApiKeyChange}
            margin="normal"
            type="password"
            helperText="Enter your DANDI Sandbox API key for accessing protected resources on api.sandbox.dandiarchive.org"
          />
        </Paper>
        <Paper sx={{ p: 3, mt: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            EMBER API Keys
          </Typography>
          <TextField
            fullWidth
            label="EMBER API Key"
            variant="outlined"
            value={emberApiKey}
            onChange={handleEmberApiKeyChange}
            margin="normal"
            type="password"
            helperText="Enter your DANDI API key for accessing protected resources on api.dandiarchive.org"
          />
          {showSaveNotification && (
            <Alert severity="info" sx={{ mt: 2 }}>
              API key saved. Please reload the page for the changes to take
              effect.
            </Alert>
          )}
        </Paper>
      </Box>
    </div>
  );
};

export default SettingsPage;
