import { useWindowDimensions } from "@fi-sci/misc";
import {
  AIContextProvider,
  ComponentRegistrationForAI,
  useAIContext,
} from "./AIContext";
import { useEffect } from "react";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  AppBar,
  Button,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import {
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import StatusBar from "@components/StatusBar";
import "@css/App.css";
import DandiPage from "./pages/DandiPage/DandiPage";
import DandisetPage from "./pages/DandisetPage";
import GuidePage from "./pages/GuidePage/GuidePage";
import HomePage from "./pages/HomePage/HomePage";
import NwbPage from "./pages/NwbPage/NwbPage";
import OpenNeuroDatasetPage from "./pages/OpenNeuroDatasetPage/OpenNeuroDatasetPage";
import OpenNeuroPage from "./pages/OpenNeuroPage/OpenNeuroPage";
import SettingsPage from "./pages/SettingsPage/SettingsPage";
import EdfPage from "./pages/EdfPage/EdfPage";

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

const LegacyUrlHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const p = searchParams.get("p");
    if (!p) return;

    let newPath = "";
    let newSearch = "";

    if (p === "/dandi") {
      newPath = "/dandi";
    } else if (p === "/dandiset") {
      const dandisetId = searchParams.get("dandisetId");
      const dandisetVersion = searchParams.get("dandisetVersion");
      if (dandisetId) {
        newPath = `/dandiset/${dandisetId}`;
        if (dandisetVersion) {
          newSearch = `?dandisetVersion=${dandisetVersion}`;
        }
      }
    } else if (p === "/edf") {
      newPath = "/edf";
      const urlParam = searchParams.get("url");
      const versionParam = searchParams.get("versionId");
      if (urlParam) {
        newSearch = `?url=${urlParam}${versionParam ? `&versionId=${versionParam}` : ""}`;
      }
    } else if (p === "/nwb") {
      newPath = "/nwb";
      const urlParam = searchParams.get("url");
      const tabParam = searchParams.get("tab");

      // Handle encoded parameters
      const params = new URLSearchParams();
      ["dandisetId", "dandisetVersion"].forEach((param) => {
        const value = searchParams.get(param);
        if (value) params.append(param, value);
      });

      // Build query string with parameters in specific order
      const queryParts = [];

      // 1. url (unencoded)
      if (urlParam) queryParts.push(`url=${urlParam}`);

      // 2. dandisetId
      const dandisetId = searchParams.get("dandisetId");
      if (dandisetId)
        queryParts.push(`dandisetId=${encodeURIComponent(dandisetId)}`);

      // 3. dandisetVersion
      const dandisetVersion = searchParams.get("dandisetVersion");
      if (dandisetVersion)
        queryParts.push(
          `dandisetVersion=${encodeURIComponent(dandisetVersion)}`,
        );

      // 4. tab
      if (tabParam?.startsWith("neurodata-item:")) {
        const path = tabParam.split("|")[0].replace("neurodata-item:", "");
        queryParts.push(`tab=${path}`);
      }
      if (tabParam?.startsWith("view:")) {
        const b = tabParam.slice("view:".length).split("|");
        if (b[0] === "X/Y") {
          queryParts.push(`tab=SpatialSeriesXY|${b[1]}`);
        }
      }
      if (tabParam?.startsWith("neurodata-items:")) {
        const x = tabParam.slice("neurodata-items:".length).split("@");
        let y = x.map((z) => {
          if (z.startsWith("neurodata-item")) {
            const b = z.slice("neurodata-item:".length).split("|");
            return b[0];
          } else if (z.startsWith("view:")) {
            const b = z.slice("view:".length).split("|");
            if (b[0] === "X/Y") {
              return `SpatialSeriesXY|${b[1]}`;
            } else if (b[0] === "RasterPlot") {
              return `Raster|${b[1]}`;
            }
          }
          return "";
        });
        y = y.filter((z) => z !== "");
        queryParts.push(`tab=${JSON.stringify(y)}`);
      }

      if (queryParts.length > 0) {
        newSearch = "?" + queryParts.join("&");
      }
    }

    if (newPath) {
      // Preserve embedded=1 if present
      const hideParam = searchParams.get("embedded");
      if (hideParam === "1") {
        if (newSearch) {
          newSearch += "&embedded=1";
        } else {
          newSearch = "?embedded=1";
        }
      }
      navigate(newPath + newSearch, { replace: true });
    }
  }, [location, searchParams, navigate]);

  return null;
};

const AppContent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { registerComponentForAI, unregisterComponentForAI } = useAIContext();

  useEffect(() => {
    const registration: ComponentRegistrationForAI = {
      id: "App",
      context: {
        currentRoute: location.pathname,
        params: Object.fromEntries(searchParams.entries()),
      },
      callbacks: [
        {
          id: "navigate",
          description: aiRouteContextDescription,
          parameters: {
            route: {
              type: "string",
              description: "The route to navigate to. Be sure to provide this.",
            },
          },
          callback: (parameters) => {
            if (!parameters.route) {
              console.warn("No route provided to navigate to", parameters);
              return;
            }
            navigate(parameters.route);
          },
        },
      ],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("route");
  }, [
    location,
    searchParams,
    navigate,
    registerComponentForAI,
    unregisterComponentForAI,
  ]);
  const { width, height } = useWindowDimensions();
  const hideAppBar = searchParams.get("embedded") === "1";
  const appBarHeight = hideAppBar ? 0 : 50; // hard-coded to match the height of the AppBar
  const statusBarHeight = 20;
  const mainHeight = height - appBarHeight - statusBarHeight;
  return (
    <div
      className="AppContentDiv"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      {!hideAppBar && (
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
                Neurosift (v2)
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
              <Button
                color="inherit"
                onClick={() => {
                  window.open(
                    "https://github.com/flatironinstitute/neurosift/blob/main/doc/neurosift_v2_migration.md",
                    "_blank",
                  );
                }}
                sx={{
                  ml: 2,
                  textTransform: "none",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  "&:hover": {
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                  },
                }}
              >
                Neurosift was updated
              </Button>
              <Tooltip title="View this in Neurosift v1">
                <IconButton
                  color="inherit"
                  onClick={() => {
                    const loc = window.location;
                    const path = loc.pathname;
                    const search = loc.search;

                    let v1Url = "https://v1.neurosift.app";

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
                  sx={{ ml: 2, fontSize: "0.75rem", padding: "4px" }}
                >
                  1
                </IconButton>
              </Tooltip>
            </Toolbar>
          </AppBar>
        </div>
      )}

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
          <Route
            path="/edf"
            element={<EdfPage width={width} height={mainHeight} />}
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
        <StatusBar />
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <AIContextProvider>
          <LegacyUrlHandler />
          <AppContent />
        </AIContextProvider>
      </Router>
    </ThemeProvider>
  );
}

const aiRouteContextDescription = `
Navigate to a new route in the Neurosift application.

Possible routes are:
/ (Home page)
/dandi (Browse DANDI - once you get there then you'll be able to do searches)
/dandiset/:dandisetId (View a DANDI dataset)
/openneuro (Browse OpenNeuro - once you get there then you'll be able to do searches)
/openneuro-dataset/:datasetId (View an OpenNeuro dataset)
/settings (View the settings page to set API keys)
/guide (View the NWB Viewer Guide)

If the user wants to search for a dandiset or a dataset, then you should first navigate to the appropriate route, and then you can see what interactions are available at that point.
`;

export default App;
