import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import HomePage from "./pages/HomePage/HomePage";
import DandiPage from "./pages/DandiPage/DandiPage";
import DandisetPage from "./pages/DandisetPage";
import OpenNeuroPage from "./pages/OpenNeuroPage/OpenNeuroPage";
import NwbPage from "./pages/NwbPage/NwbPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import GuidePage from "./pages/GuidePage/GuidePage";
import "./css/App.css";
import { useWindowDimensions } from "@fi-sci/misc";
import OpenNeuroDatasetPage from "./pages/OpenNeuroDatasetPage/OpenNeuroDatasetPage";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2c3e50",
      dark: "#1a2530",
      light: "#3e5771",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#9c27b0",
      dark: "#7b1fa2",
      light: "#ba68c8",
      contrastText: "#ffffff",
    },
    text: {
      primary: "rgb(33, 33, 33)",
      secondary: "rgb(66, 66, 66)",
    },
    background: {
      default: "rgb(250, 250, 250)",
      paper: "#ffffff",
    },
  },
});

const AppContent = () => {
  const navigate = useNavigate();
  const { width, height } = useWindowDimensions();
  const appBarHeight = 50; // hard-coded to match the height of the AppBar
  const statusBarHeight = 20;
  const mainHeight = height - appBarHeight - statusBarHeight;
  return (
    <div
      className="AppContentDiv"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        className="AppBarDiv"
        style={{
          position: "absolute",
          width,
          height: appBarHeight,
          overflow: "hidden",
        }}
      >
        <AppBar position="static">
          <Toolbar>
            <img
              src="/neurosift-logo.png"
              alt="Neurosift Logo"
              style={{
                height: "32px",
                marginRight: "10px",
                cursor: "pointer",
                // filter: "brightness(1.35) contrast(1.15) saturate(1.1)",
              }}
              onClick={() => navigate("/")}
            />
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                cursor: "pointer",
                "&:hover": {
                  opacity: 0.8,
                },
              }}
              onClick={() => navigate("/")}
            >
              Neurosift v2 (Beta)
            </Typography>
            <Tooltip title="Settings">
              <IconButton
                color="inherit"
                onClick={() => navigate("/settings")}
                sx={{ ml: 2 }}
              >
                <SettingsIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="View this in Neurosift v1">
              <IconButton
                color="inherit"
                onClick={() => {
                  const loc = window.location;
                  const path = loc.pathname;
                  const search = loc.search;

                  let v1Url = "https://neurosift.app";

                  if (path === "/dandi") {
                    v1Url += "?p=/dandi";
                  } else if (path.startsWith("/dandiset/")) {
                    const dandisetId = path.split("/").pop();
                    v1Url += `?p=/dandiset&dandisetId=${dandisetId}`;
                  } else if (path === "/nwb") {
                    // Convert search params to append to ?p=/nwb
                    v1Url += `?p=/nwb${search.replace("?", "&")}`;
                  }

                  window.location.href = v1Url;
                }}
                sx={{ ml: 2 }}
              >
                1
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>
      </div>

      <div
        className="AppContentMainDiv"
        style={{
          position: "absolute",
          width,
          height: mainHeight,
          overflow: "hidden",
          top: appBarHeight,
        }}
      >
        <Routes>
          <Route
            path="/"
            element={<HomePage width={width} height={mainHeight} />}
          />
          <Route
            path="/dandi"
            element={<DandiPage width={width} height={mainHeight} />}
          />
          <Route
            path="/dandiset/:dandisetId"
            element={<DandisetPage width={width} height={mainHeight} />}
          />
          <Route
            path="/openneuro"
            element={<OpenNeuroPage width={width} height={mainHeight} />}
          />
          <Route
            path="/openneuro-dataset/:datasetId"
            element={<OpenNeuroDatasetPage width={width} height={mainHeight} />}
          />
          <Route
            path="/nwb"
            element={<NwbPage width={width} height={mainHeight} />}
          />
          <Route
            path="/settings"
            element={<SettingsPage width={width} height={mainHeight} />}
          />
          <Route
            path="/guide"
            element={<GuidePage width={width} height={mainHeight} />}
          />
        </Routes>
      </div>

      <div
        className="StatusBarDiv"
        style={{
          position: "absolute",
          width,
          height: statusBarHeight,
          overflow: "hidden",
          top: appBarHeight + mainHeight,
        }}
      >
        {/* Status bar */}
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
