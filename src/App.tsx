import ErrorBoundary from "@components/ErrorBoundary";
import StatusBar from "@components/StatusBar";
import "@css/App.css";
import { useWindowDimensions } from "@fi-sci/misc";
import { CircularProgress } from "@mui/material";
import { AppBar } from "@ui";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { lazy, Suspense, useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { AIComponentRegistryProvider } from "./ai-integration/AIComponentRegistry";
import { sendUrlUpdate } from "./ai-integration/messaging/windowMessaging";
import { logPageLoad } from "./util/sendLog";
import { v1Url } from "./util/v1Url";

// Each page is its own chunk, so a visit downloads only the page it lands on.
const DandisetPageContainer = lazy(
  () => import("./pages/DandisetPage/DandisetPageContainer"),
);
const EdfPage = lazy(() => import("./pages/EdfPage/EdfPage"));
const EmberDandisetPageContainer = lazy(
  () => import("./pages/EmberDandisetPage/EmberDandisetPageContainer"),
);
const GuidePage = lazy(() => import("./pages/GuidePage/GuidePage"));
const HomePage = lazy(() => import("./pages/HomePage/HomePage"));
const NwbPage = lazy(() => import("./pages/NwbPage/NwbPage"));
const OpenNeuroDatasetPage = lazy(
  () => import("./pages/OpenNeuroDatasetPage/OpenNeuroDatasetPage"),
);
const SearchPage = lazy(() => import("./pages/SearchPage/SearchPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage/SettingsPage"));
const SlpPage = lazy(() => import("./pages/SlpPage/SlpPage"));
const VideoPage = lazy(() => import("./pages/VideoPage/VideoPage"));

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

const PageLoading = () => (
  <div style={{ padding: 20 }}>
    <CircularProgress />
  </div>
);

const AppContent = () => {
  const [searchParams] = useSearchParams();

  // useRegisterAIComponent({ navigate });

  const location = useLocation();

  // Log initial page load
  useEffect(() => {
    const fullUrl =
      window.location.protocol +
      "//" +
      window.location.host +
      location.pathname +
      location.search;
    logPageLoad(fullUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    // send to neurosift-chat
    sendUrlUpdate(
      window.location.protocol +
        "//" +
        window.location.host +
        location.pathname +
        location.search,
    );
  }, [location]);

  const { width, height } = useWindowDimensions();
  const hideAppBar = searchParams.get("embedded") === "1";
  const appBarHeight = hideAppBar ? 0 : 48; // layout/appbar-height
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
          <AppBar
            homeHref={import.meta.env.BASE_URL}
            logo={
              <img
                src={`${import.meta.env.BASE_URL}neurosift-logo.png`}
                alt=""
                className="app-bar-logo"
              />
            }
            actions={[
              {
                label: "Guide",
                href: `${import.meta.env.BASE_URL}guide`,
                icon: "help",
              },
              {
                label: "Report a problem on GitHub",
                href: "https://github.com/flatironinstitute/neurosift/issues",
                icon: "logo--github",
                iconOnly: true,
                external: true,
              },
              {
                label: "Settings",
                href: `${import.meta.env.BASE_URL}settings`,
                icon: "settings",
                iconOnly: true,
              },
              {
                label: "Open in Neurosift v1",
                href: v1Url(location.pathname, location.search),
                icon: "launch",
              },
            ]}
          />
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
        <ErrorBoundary what="this page" resetKey={location.key}>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route
                path="/"
                element={<HomePage width={width} height={mainHeight} />}
              />
              <Route
                path="/search"
                element={<SearchPage width={width} height={mainHeight} />}
              />
              <Route
                path="/dandi"
                element={
                  <SearchPage
                    width={width}
                    height={mainHeight}
                    archive="DANDI"
                  />
                }
              />
              <Route
                path="/dandiset/:dandisetId"
                element={
                  <DandisetPageContainer width={width} height={mainHeight} />
                }
              />
              <Route
                path="/ember"
                element={
                  <SearchPage
                    width={width}
                    height={mainHeight}
                    archive="EMBER"
                  />
                }
              />
              <Route
                path="/ember-dandiset/:dandisetId"
                element={
                  <EmberDandisetPageContainer
                    width={width}
                    height={mainHeight}
                  />
                }
              />
              <Route
                path="/openneuro"
                element={
                  <SearchPage
                    width={width}
                    height={mainHeight}
                    archive="OpenNeuro"
                  />
                }
              />
              <Route
                path="/openneuro-dataset/:datasetId"
                element={
                  <OpenNeuroDatasetPage width={width} height={mainHeight} />
                }
              />
              <Route
                path="/nwb"
                element={<NwbPage width={width} height={mainHeight} />}
              />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/guide" element={<GuidePage />} />
              <Route
                path="/edf"
                element={<EdfPage width={width} height={mainHeight} />}
              />
              <Route
                path="/video"
                element={<VideoPage width={width} height={mainHeight} />}
              />
              <Route
                path="/slp"
                element={<SlpPage width={width} height={mainHeight} />}
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
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
      <Router basename={import.meta.env.BASE_URL}>
        <AIComponentRegistryProvider>
          <AppContent />
        </AIComponentRegistryProvider>
      </Router>
    </ThemeProvider>
  );
}

// const useRegisterAIComponent = ({
//   navigate,
// }: {
//   navigate: NavigateFunction;
// }) => {
//   const { registerComponentForAI, unregisterComponentForAI } =
//     useAIComponentRegistry();

//   useEffect(() => {
//     const registration: AIRegisteredComponent = {
//       id: "App",
//       context: aiContextDescription,
//       callbacks: [
//         {
//           id: "navigate",
//           description: `
// Navigate to a specific page.

// / - Home page
// /dandi - DANDI Archive
// /dandiset/:dandisetId - Dandiset page
// /nwb?dandisetId=:dandisetId&dandisetVersion=:dandisetVersion&url=:url - NWB page
// /openneuro - OpenNeuro page
// /openneuro-dataset/:datasetId - OpenNeuro dataset page
// /settings - Settings page
// `,
//           parameters: {
//             path: {
//               type: "string",
//               description: "Path to navigate to",
//             },
//           },
//           callback: ({ path }: { path: string }) => {
//             navigate(path);
//           },
//         },
//       ],
//     };
//     registerComponentForAI(registration);
//     return () => unregisterComponentForAI("App");
//   }, [registerComponentForAI, unregisterComponentForAI, navigate]);
// };

// const aiContextDescription = `
// The user can click the Neurosift logo or title to navigate to the home page.
// The user can click the Settings icon in the upper right part of the window to navigate to the settings page where they can configure Neurosift including setting API keys.
// `;

export default App;
