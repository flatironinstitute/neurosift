import { Box, Typography, TextField, Paper, Alert } from "@mui/material";
import { FunctionComponent, useState, useEffect } from "react";
import UserManagementSection from "../../jobManager/components/UserManagementSection";

type SettingsPageProps = {
  width: number;
  height: number;
};

const SettingsPage: FunctionComponent<SettingsPageProps> = ({
  width,
  height,
}) => {
  const [neurosiftApiKey, setNeurosiftApiKey] = useState("");
  const [dandiApiKey, setDandiApiKey] = useState("");
  const [dandiStagingApiKey, setDandiStagingApiKey] = useState("");
  const [adminApiKey, setAdminApiKey] = useState("");
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  useEffect(() => {
    // Load initial values from localStorage
    const savedNeurosiftApiKey = localStorage.getItem("neurosiftApiKey") || "";
    const savedDandiApiKey = localStorage.getItem("dandiApiKey") || "";
    const savedDandiStagingApiKey =
      localStorage.getItem("dandiStagingApiKey") || "";
    const savedAdminApiKey = localStorage.getItem("adminApiKey") || "";
    setNeurosiftApiKey(savedNeurosiftApiKey);
    setDandiApiKey(savedDandiApiKey);
    setDandiStagingApiKey(savedDandiStagingApiKey);
    setAdminApiKey(savedAdminApiKey);
  }, []);

  const handleNeurosiftApiKeyChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newKey = event.target.value;
    setNeurosiftApiKey(newKey);
    localStorage.setItem("neurosiftApiKey", newKey);
    setShowSaveNotification(true);
  };

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

  return (
    <div style={{ position: "absolute", width, height, overflowY: "auto" }}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Paper sx={{ p: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Neurosift API Key
          </Typography>
          <TextField
            fullWidth
            label="Neurosift API Key"
            variant="outlined"
            value={neurosiftApiKey}
            onChange={handleNeurosiftApiKeyChange}
            margin="normal"
            type="password"
            helperText={
              <>
                Enter your Neurosift API key for accessing job management
                features. You can obtain a key by filling out{" "}
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSctE61_jy3WyQ5o0jqJDEifnrZvoYdXgzakAz_gGhenLXsltw/viewform?usp=header"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  this form
                </a>
              </>
            }
          />
        </Paper>

        <Paper sx={{ p: 3, mt: 3, maxWidth: 600 }}>
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
            helperText="Enter your DANDI Staging API key for accessing protected resources on api-staging.dandiarchive.org"
          />
          {showSaveNotification && (
            <Alert severity="info" sx={{ mt: 2 }}>
              API key saved. Please reload the page for the changes to take
              effect.
            </Alert>
          )}
        </Paper>

        <Paper sx={{ p: 3, mt: 3, maxWidth: 600 }}>
          <Typography variant="h6" gutterBottom>
            Admin Settings
          </Typography>
          <TextField
            fullWidth
            label="Admin secret Key"
            variant="outlined"
            value={adminApiKey}
            onChange={(e) => {
              const newKey = e.target.value;
              setAdminApiKey(newKey);
              localStorage.setItem("adminApiKey", newKey);
              setShowSaveNotification(true);
            }}
            margin="normal"
            type="password"
            helperText="Enter the admin secret key to manage users"
          />
        </Paper>

        <UserManagementSection adminApiKey={adminApiKey} />
      </Box>
    </div>
  );
};

export default SettingsPage;
