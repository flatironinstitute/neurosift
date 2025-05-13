import React from "react";
import { Alert, Button, Box, Link } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface AuthErrorNotificationProps {
  dandiUrl?: string;
}

const AuthErrorNotification: React.FC<AuthErrorNotificationProps> = ({ dandiUrl }) => {
  const navigate = useNavigate();
  
  const isDandiStaging = dandiUrl?.includes("api-staging.dandiarchive.org");
  const serverType = isDandiStaging ? "DANDI Staging" : "DANDI";

  return (
    <Box sx={{ m: 2 }}>
      <Alert 
        severity="warning"
        sx={{ 
          mb: 2,
          "& .MuiAlert-message": { 
            width: "100%" 
          }
        }}
      >
        <Box>
          <strong>Permission Required</strong>
          <p>
            This appears to be an embargoed dataset that requires authentication to access.
            You need to provide a valid {serverType} API key in your settings.
          </p>
          <Box sx={{ mt: 2, display: "flex", gap: 2 }}>
            <Button 
              variant="contained" 
              color="primary"
              size="small"
              onClick={() => navigate("/settings")}
            >
              Go to Settings
            </Button>
            <Button
              variant="outlined"
              size="small"
              component={Link}
              href={isDandiStaging ? "https://gui-staging.dandiarchive.org" : "https://dandiarchive.org"}
              target="_blank"
            >
              Get API Key from {serverType}
            </Button>
          </Box>
        </Box>
      </Alert>
    </Box>
  );
};

export default AuthErrorNotification;
