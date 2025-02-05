import { SmallIconButton } from "@fi-sci/misc";
import ModalWindow from "@fi-sci/modal-window";
import { Chat, Key, Note, QuestionMark } from "@mui/icons-material";
import { AppBar, Toolbar } from "@mui/material";
import useRoute from "neurosift-lib/contexts/useRoute";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import ApiKeysWindow from "./ApiKeysWindow/ApiKeysWindow";

type Props = {
  onContextChat: () => void;
};

export const applicationBarHeight = 50;

// tricky
const logoUrl = window.location.hostname.includes("github.io")
  ? `/neurosift/neurosift-logo.png`
  : `/neurosift-logo.png`;

const ApplicationBar: FunctionComponent<Props> = ({ onContextChat }) => {
  const { route, setRoute } = useRoute();

  const onHome = useCallback(() => {
    setRoute({ page: "home" });
  }, [setRoute]);

  // const {visible: githubAccessWindowVisible, handleOpen: openGitHubAccessWindow, handleClose: closeGitHubAccessWindow} = useModalDialog()
  const {
    visible: apiKeysWindowVisible,
    handleOpen: openApiKeysWindow,
    handleClose: closeApiKeysWindow,
  } = useModalDialog();

  // light greenish background color for app bar
  // const barColor = '#e0ffe0'

  // const barColor = '#65a6fc'
  const barColor = "#333";

  // const bannerColor = '#00a000'
  const titleColor = "white";
  // const bannerColor = titleColor

  // const star = <span style={{color: bannerColor, fontSize: 20}}>★</span>

  const openInNeurosiftV2Url = useMemo(() => {
    const baseUrl = "https://neurosift2.vercel.app";
    if (route.page === "dandi") return `${baseUrl}/dandi`;
    else if (route.page === "dandiset") return `${baseUrl}/dandiset/${route.dandisetId}`;
    else if (route.page === "nwb") {
      let url = `${baseUrl}/nwb?url=${route.url}`;
      if (route.dandisetId) url += `&dandisetId=${route.dandisetId}`;
      if (route.dandisetVersion) url += `&dandisetVersion=${route.dandisetVersion}`;
      if (route.tab) {
        let tab = route.tab;
        if (tab.startsWith("neurodata-item:")) {
          const a = tab.split(":")[1];
          const b = a?.split("|");
          tab = b[0];
        }
        if (tab) {
          url += `&tab=${tab}`;
        }
      }
      return url;
    }
    else if (route.page === "home") {
      return baseUrl + "/";
    }
    else return "";
  }, [route]);

  return (
    <span>
      <AppBar
        position="static"
        style={{
          height: applicationBarHeight - 10,
          color: "black",
          background: barColor,
          userSelect: "none",
        }}
      >
        <Toolbar style={{ minHeight: applicationBarHeight - 10 }}>
          <img
            src={logoUrl}
            alt="logo"
            height={30}
            style={{ paddingBottom: 5, cursor: "pointer" }}
            onClick={onHome}
          />
          <div
            onClick={onHome}
            style={{ cursor: "pointer", color: titleColor }}
          >
            &nbsp;&nbsp;&nbsp;Neurosift
          </div>
          {/* <div style={{color: bannerColor, position: 'relative', top: -2}}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{star} This viewer is in alpha and is under <Hyperlink color={bannerColor} href="https://github.com/flatironinstitute/neurosift" target="_blank">active development</Hyperlink> {star}</div> */}
          <ReportDandiApiDown />
          <span style={{ marginLeft: "auto" }} />
          {/* <span style={{ color: "white" }}>
            <SmallIconButton
              icon={<Computer />}
              title={`Learn about the online workshop`}
              onClick={() => setRoute({ page: "about" })}
            />
          </span>
          &nbsp; &nbsp; */}
          <span style={{ color: "white" }}>
            <SmallIconButton
              icon={<QuestionMark />}
              onClick={() => setRoute({ page: "about" })}
              title={`About Neurosift`}
            />
          </span>
          {(route.page === "dandi" ||
            route.page === "dandiset" ||
            route.page === "dandi-query") && (
            <>
              &nbsp;&nbsp;&nbsp;&nbsp;
              <span style={{ color: "white" }}>
                <SmallIconButton
                  icon={<Chat />}
                  onClick={onContextChat}
                  title={`AI chat`}
                />
              </span>
            </>
          )}
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span style={{ color: "white" }}>
            <SmallIconButton
              icon={<Note />}
              onClick={() => {
                setRoute({ page: "annotations" });
              }}
              title={`View annotations`}
            />
          </span>
          &nbsp;&nbsp;&nbsp;&nbsp;
          <span style={{ color: "yellow" }}>
            <SmallIconButton
              icon={<Key />}
              onClick={openApiKeysWindow}
              title={`Set DANDI API key`}
            />
          </span>
          &nbsp;&nbsp;&nbsp;&nbsp;
          {openInNeurosiftV2Url && <span style={{ color: "white" }}>
            <SmallIconButton
              icon={<span style={{fontWeight: 'bold'}}>2</span>}
              onClick={() => {
                window.location.href = openInNeurosiftV2Url;
              }}
              title={`Open in Neurosift v2 (WIP)`}
            />
          </span>}
          &nbsp;&nbsp;
          {/* {
                        signedIn && (
                            <span style={{fontFamily: 'courier', color: 'lightgray', cursor: 'pointer'}} title={`Signed in as ${userId}`} onClick={openGitHubAccessWindow}><UserIdComponent userId={userId} />&nbsp;&nbsp;</span>
                        )
                    } */}
          {/* <span style={{paddingBottom: 0, cursor: 'pointer'}} onClick={openGitHubAccessWindow} title={signedIn ? "Manage log in" : "Log in"}>
                        {
                            signedIn ? (
                                <Logout />
                            ) : (
                                <Login />
                            )
                        }
                        &nbsp;
                        {
                            !signedIn && (
                                <span style={{position: 'relative', top: -5}}>Log in</span>
                            )
                        }
                    </span> */}
        </Toolbar>
      </AppBar>
      <ModalWindow
        visible={apiKeysWindowVisible}
        // onClose={closeApiKeysWindow}
      >
        <ApiKeysWindow onClose={() => closeApiKeysWindow()} />
      </ModalWindow>
    </span>
  );
};

export const useModalDialog = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const handleOpen = useCallback(() => {
    setVisible(true);
  }, []);
  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);
  return useMemo(
    () => ({
      visible,
      handleOpen,
      handleClose,
    }),
    [visible, handleOpen, handleClose],
  );
};

const ReportDandiApiDown: FunctionComponent = () => {
  const testUrl = "https://api.dandiarchive.org/api/dandisets/?page_size=1";
  const [down, setDown] = useState<boolean>(false);
  useEffect(() => {
    fetch(testUrl)
      .then((response) => {
        if (!response.ok) {
          setDown(true);
        }
      })
      .catch(() => {
        setDown(true);
      });
  }, []);
  if (!down) return <span />;
  return (
    <span style={{ color: "#fee", marginLeft: 10 }}>
      * DANDI API appears to be down. Some features may not work. *
    </span>
  );
};

export default ApplicationBar;
