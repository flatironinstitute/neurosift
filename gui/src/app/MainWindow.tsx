import { useWindowDimensions } from "@fi-sci/misc";
import { FunctionComponent } from "react";
import ApplicationBar, { applicationBarHeight } from "./ApplicationBar";
import StatusBar, { statusBarHeight } from "./StatusBar";
import DandiPage from "./pages/DandiPage/DandiPage";
import DandisetPage from "./pages/DandisetPage/DandisetPage";
import HomePage from "./pages/HomePage/HomePage";
import NwbPage from "./pages/NwbPage/NwbPage";
import useRoute from "./useRoute";
import TestPage from "./pages/TestPage/TestPage";
import NeurosiftAnnotationsLoginPage from "./pages/NeurosiftAnnotationsLoginPage/NeurosiftAnnotationsLoginPage";
import DandiQueryPage from "./pages/DandiQueryPage/DandiQueryPage";
import TestsPage from "./pages/TestsPage/TestsPage";
import AnnotationsPage from "./pages/AnnotationsPage/AnnotationsPage";
import PluginPage from "./pages/PluginPage/PluginPage";
import AviPage from "./pages/AviPage/AviPage";
import { Analytics } from "@vercel/analytics/react";

type Props = {
  // none
};

const MainWindow: FunctionComponent<Props> = () => {
  const { route } = useRoute();
  const { width, height } = useWindowDimensions();
  const H = height - applicationBarHeight - statusBarHeight;
  return (
    <div
      className="MainWindow"
      style={{ position: "absolute", width, height, overflow: "hidden" }}
    >
      <div
        className="MainWindowApplicationBar"
        style={{
          position: "absolute",
          width,
          height: applicationBarHeight,
          overflow: "hidden",
        }}
      >
        <ApplicationBar />
      </div>
      <div
        className="MainWindowContent"
        style={{
          position: "absolute",
          top: applicationBarHeight,
          width,
          height: H,
          overflow: "hidden",
        }}
      >
        {route.page === "home" ? (
          <HomePage width={width} height={H} />
        ) : route.page === "about" ? (
          <HomePage width={width} height={H} />
        ) : route.page === "test" ? (
          <TestPage width={width} height={H} />
        ) : route.page === "nwb" ? (
          <NwbPage width={width} height={H} />
        ) : // ) : route.page === 'avi' ? (
        //     <AviPage
        //         width={width}
        //         height={H}
        //         url={route.url}
        //     />
        route.page === "avi" ? (
          <AviPage width={width} height={H} />
        ) : route.page === "dandiset" ? (
          <DandisetPage width={width} height={H} />
        ) : route.page === "dandi" ? (
          <DandiPage width={width} height={H} />
        ) : route.page === "dandi-query" ? (
          <DandiQueryPage width={width} height={H} />
        ) : route.page === "annotations" ? (
          <AnnotationsPage width={width} height={H} />
        ) : route.page === "tests" ? (
          <TestsPage width={width} height={H} />
        ) : route.page === "neurosift-annotations-login" ? (
          <NeurosiftAnnotationsLoginPage />
        ) : route.page === "plugin" ? (
          <PluginPage width={width} height={H} />
        ) : (
          <div>404</div>
        )}
      </div>
      {statusBarHeight && (
        <div
          className="MainWindowStatusBar"
          style={{
            position: "absolute",
            bottom: 0,
            width,
            height: statusBarHeight,
            backgroundColor: "#eee",
            overflow: "hidden",
          }}
        >
          <StatusBar width={width} height={statusBarHeight} />
        </div>
      )}
      <Analytics />
    </div>
  );
};

export default MainWindow;
