import { Hyperlink, useWindowDimensions } from "@fi-sci/misc";
import { useModalWindow } from "@fi-sci/modal-window";
import { Analytics } from "@vercel/analytics/react";
import { FunctionComponent, useEffect, useState } from "react";
import ApplicationBar, { applicationBarHeight } from "./ApplicationBar";
import RandomFeedbackForm from "./Feedback/RandomFeedbackForm";
import StatusBar, {
  statusBarHeight,
  useCustomStatusBarElements,
} from "./StatusBar";
import AnnotationsPage from "./pages/AnnotationsPage/AnnotationsPage";
import AviPage from "./pages/AviPage/AviPage";
import DandiPage from "./pages/DandiPage/DandiPage";
import DandiQueryPage from "./pages/DandiQueryPage/DandiQueryPage";
import DandisetPage from "./pages/DandisetPage/DandisetPage";
import EdfPage from "./pages/EdfPage/EdfPage";
import HomePage from "./pages/HomePage/HomePage";
import NeurosiftAnnotationsLoginPage from "./pages/NeurosiftAnnotationsLoginPage/NeurosiftAnnotationsLoginPage";
import NwbPage from "./pages/NwbPage/NwbPage";
import PluginPage from "./pages/PluginPage/PluginPage";
import TestPage from "./pages/TestPage/TestPage";
import TestsPage from "./pages/TestsPage/TestsPage";
import useRoute from "./useRoute";

type Props = {
  // none
};

type Position =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "full";

const MainWindow: FunctionComponent<Props> = () => {
  const { route } = useRoute();
  const { width, height } = useWindowDimensions();
  const H = height - applicationBarHeight - statusBarHeight;
  const { setCustomStatusBarElement } = useCustomStatusBarElements();
  useEffect(() => {
    setCustomStatusBarElement("route", <NotUsingCookiesNotice />);
  }, [setCustomStatusBarElement]);
  const {
    visible: contextChatVisible,
    handleOpen: openContextChat,
    handleClose: closeContextChat,
  } = useModalWindow();
  const [contextChatPosition, setContextChatPosition] =
    useState<Position>("bottom-left");
  const [showDandiPageChat, setShowDandiPageChat] = useState(false);
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
        <ApplicationBar
          onContextChat={() => {
            if (route.page === "dandi") setShowDandiPageChat((v) => !v);
            else if (route.page === "dandiset") setShowDandiPageChat((v) => !v);
            else if (route.page === "dandi-query")
              setShowDandiPageChat((v) => !v);
            else if (route.page === "nwb") {
              if (contextChatVisible) closeContextChat();
              else openContextChat();
            }
          }}
        />
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
        ) : route.page === "edf" ? (
          <EdfPage width={width} height={H} />
        ) : route.page === "dandiset" ? (
          <DandisetPage width={width} height={H} showChat={showDandiPageChat} />
        ) : route.page === "dandi" ? (
          <DandiPage width={width} height={H} showChat={showDandiPageChat} />
        ) : route.page === "dandi-query" ? (
          <DandiQueryPage
            width={width}
            height={H}
            showChat={showDandiPageChat}
          />
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
      <RandomFeedbackForm />
    </div>
  );
};

const NotUsingCookiesNotice: FunctionComponent = () => {
  const { hideNotUsingCookiesMessage, setHideNotUsingCookiesMessage } =
    useHideNotUsingCookiesMessage();
  if (hideNotUsingCookiesMessage) return <span />;
  return (
    <span>
      We do not use cookies, but we collect anonymous usage statistics{" "}
      <Hyperlink
        color="green"
        onClick={() => {
          setHideNotUsingCookiesMessage(true);
        }}
      >
        OK
      </Hyperlink>
    </span>
  );
};

const useHideNotUsingCookiesMessage = () => {
  const [hide, setHide] = useState(false);
  const key = "hideNotUsingCookiesMessage";
  const value = "3"; // this could be incremented if the message is updated
  useEffect(() => {
    const h = localStorage.getItem(key) === value;
    setHide(h);
  }, []);
  const setHideNotUsingCookiesMessage = (v: boolean) => {
    localStorage.setItem(key, v ? value : "0");
    setHide(v);
  };
  return { hideNotUsingCookiesMessage: hide, setHideNotUsingCookiesMessage };
};

export default MainWindow;
