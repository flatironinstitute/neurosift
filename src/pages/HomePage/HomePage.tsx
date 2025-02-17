import { Box, Button, Container, Paper, Typography, Link } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import GitHubIcon from "@mui/icons-material/GitHub";
import { useNavigate } from "react-router-dom";
import ScrollY from "@components/ScrollY";

type HomePageProps = {
  width: number;
  height: number;
};

const HomePage: FunctionComponent<HomePageProps> = ({ width, height }) => {
  const navigate = useNavigate();

  return (
    <ScrollY width={width} height={height}>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to Neurosift v2 (Beta)
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Neurosift is a browser-based tool designed for the visualization and
            processing of NWB (Neurodata Without Borders) files, whether stored
            locally or hosted remotely, and enables interactive exploration and
            analysis of the online repositories such as DANDI Archive.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          }}
        >
          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box sx={{ flex: 1, mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                DANDI Archive
              </Typography>
              <Typography variant="body2">
                Browse and explore datasets from the{" "}
                <Link href="https://dandiarchive.org/">
                  DANDI neuroscience data archive
                </Link>
                .
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                onClick={() => navigate("/dandi")}
                fullWidth
              >
                Browse DANDI
              </Button>
            </Box>
          </Paper>

          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box sx={{ flex: 1, mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                OpenNeuro
              </Typography>
              <Typography variant="body2">
                Access and visualize datasets from the{" "}
                <Link href="https://openneuro.org/">OpenNeuro repository</Link>.
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                onClick={() => navigate("/openneuro")}
                fullWidth
              >
                Browse OpenNeuro
              </Button>
            </Box>
          </Paper>

          <Paper
            elevation={2}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <Box sx={{ flex: 1, mb: 1 }}>
              <Typography variant="h6" gutterBottom>
                NWB Viewer Guide
              </Typography>
              <Typography variant="body2">
                Learn how to use Neurosift to visualize and analyze NWB files.
              </Typography>
            </Box>
            <Box>
              <Button
                variant="contained"
                onClick={() => navigate("/guide")}
                fullWidth
              >
                View Guide
              </Button>
            </Box>
          </Paper>
        </Box>

        <Paper
          elevation={1}
          sx={{
            p: 3,
            mt: 4,
            mb: 4,
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            borderLeft: "4px solid primary.main",
          }}
        >
          <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
            What's New in v2
          </Typography>
          <Typography variant="body1">
            Neurosift v2 brings a streamlined experience with a new
            architecture. The update focuses on core functionality and stability
            through a modular plugin system. We've omitted some experimental
            features from v1 to focus on reliability.
          </Typography>
          <Typography variant="body2" sx={{ mt: 2, color: "text.secondary" }}>
            Try v2 by clicking the "2" button in the current Neurosift. This
            version will eventually replace v1 once feature parity for core
            functionality is achieved.
          </Typography>
        </Paper>

        {/* GitHub link and build time */}
        <Box
          sx={{
            mt: 8,
            mb: 8,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Link
              href="https://github.com/flatironinstitute/neurosift/tree/main-v2"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: "text.secondary",
                textDecoration: "none",
                "&:hover": { color: "primary.main" },
              }}
            >
              <GitHubIcon />
              <Typography variant="body2">View source on GitHub</Typography>
            </Link>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"Roboto Mono", monospace',
              color: "text.disabled",
              letterSpacing: "0.05em",
              fontSize: "0.85rem",
              opacity: 0.8,
              "&::before, &::after": {
                content: '""',
                display: "inline-block",
                width: "2em",
                height: "1px",
                backgroundColor: "text.disabled",
                margin: "0 1em",
                verticalAlign: "middle",
                opacity: 0.5,
              },
            }}
          >
            <BuildTimeFooter />
          </Typography>
        </Box>
      </Container>
    </ScrollY>
  );
};

// Separate component for build time to handle the dynamic import
const BuildTimeFooter: FunctionComponent = () => {
  const [buildTime, setBuildTime] = useState<string>("");

  useEffect(() => {
    // Dynamically import the build info
    import("../../build-info.json")
      .then((buildInfo) => {
        const date = new Date(buildInfo.buildTime);
        setBuildTime(date.toLocaleString());
      })
      .catch(() => {
        // If build-info.json doesn't exist (e.g., in development), show current time
        setBuildTime(new Date().toLocaleString() + " (Development)");
      });
  }, []);

  return buildTime ? <span>Built: {buildTime}</span> : null;
};

export default HomePage;
