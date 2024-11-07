/* eslint-disable @typescript-eslint/no-explicit-any */
import { Hyperlink } from "@fi-sci/misc";
import ModalWindow, { useModalWindow } from "@fi-sci/modal-window";
import { Chat as ChatIcon, ListAlt } from "@mui/icons-material";
import { RemoteH5FileX } from "@remote-h5-file/index";
import TabWidget from "neurosift-lib/components/TabWidget";
import { reportRecentlyViewedDandiset } from "app/pages/DandiPage/DandiBrowser/DandiBrowser";
import {
  FunctionComponent,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import useRoute from "neurosift-lib/contexts/useRoute";
import {
  serializeBigInt,
  valueToElement,
} from "../BrowseNwbView/BrowseNwbView";
import { useDandiAssetContext } from "../DandiAssetContext";
import { useNwbFile } from "../NwbFileContext";
import { useNwbOpenTabs } from "../NwbOpenTabsContext";
import ViewObjectAnalysesIconThing from "../ObjectNote/ViewObjectAnalysesIconThing";
import ViewObjectNotesIconThing from "../ObjectNote/ViewObjectNotesIconThing";
import getAuthorizationHeaderForUrl from "../getAuthorizationHeaderForUrl";
import LoadInPynwbWindow from "./LoadInPynwbWindow";
import { useDatasetData, useGroup } from "./NwbMainView";
import SelectedNeurodataItemsWidget from "./SelectedNeurodataItemsWidget";
import { useContextAnnotationsForDandiset } from "../NeurosiftAnnotations/useContextAnnotations";
import ChatWindow from "neurosift-lib/pages/ChatPage/ChatWindow";
import { useSavedChats } from "neurosift-lib/pages/SavedChatsPage/savedChatsApi";
import { chatReducer, emptyChat } from "neurosift-lib/pages/ChatPage/Chat";
import { ChatContext } from "neurosift-lib/pages/ChatPage/ChatContext";

type Props = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
  usingLindi: boolean;
};

export const leftPanelLabelMap: {
  name: string;
  newName: string;
  renderer?: (val: any) => string;
}[] = [
  { name: "session_id", newName: "Session ID" },
  {
    name: "experimenter",
    newName: "Experimenter",
    renderer: (val: any) => {
      if (!val) return "";
      if (Array.isArray(val)) {
        return val.join("; ");
      } else return val + "";
    },
  },
  { name: "lab", newName: "Lab" },
  { name: "institution", newName: "Institution" },
  { name: "related_publications", newName: "Related publications" },
  { name: "experiment_description", newName: "Experiment description" },
  { name: "session_description", newName: "Session description" },
  { name: "identifier", newName: "Identifier" },
  { name: "session_start_time", newName: "Session start" },
  { name: "timestamps_reference_time", newName: "Timestamps ref." },
  { name: "file_create_date", newName: "File creation" },
];

const tabs = [
  { id: "main", label: <ListAlt />, closeable: false },
  { id: "chat", label: <ChatIcon />, closeable: false },
];

// type ChatResource = {
//   url: string;
//   selected: boolean;
// };

const NwbMainLeftPanel: FunctionComponent<Props> = ({
  width,
  height,
  nwbFile,
  usingLindi,
}) => {
  const { route } = useRoute();
  if (route.page !== "nwb") throw Error("Unexpected: route.page is not nwb");
  const [currentTabId, setCurrentTabId] = useState<string>("main");
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const contextAnnotations = useContextAnnotationsForDandiset(route.dandisetId);
  // const availableResourceUrls = useMemo(() => {
  //   if (!contextAnnotations) return [];
  //   return contextAnnotations
  //     .filter((a) => {
  //       if (a.annotationType === "note") {
  //         if (
  //           a.annotation.text.startsWith("http") &&
  //           a.annotation.text.endsWith(".ipynb")
  //         ) {
  //           return true;
  //         }
  //       }
  //       return false;
  //     })
  //     .map((a) => a.annotation.text);
  // }, [contextAnnotations]);
  const { savedChats } = useSavedChats({
    load: route.chatId ? true : false,
    chatId: route.chatId,
  });
  const initialChat = route.chatId
    ? savedChats?.find((c) => c.chatId === route.chatId) || null
    : null;
  useEffect(() => {
    if (initialChat) {
      chatDispatch({ type: "set", chat: initialChat });
      setCurrentTabId("chat");
    }
  }, [initialChat]);
  const chatContext: ChatContext = useMemo(
    () => ({
      type: "nwb",
      dandisetId: route.dandisetId,
      nwbUrl: route.url[0],
    }),
    [route.url, route.dandisetId],
  );
  return (
    <TabWidget
      tabs={tabs}
      width={width}
      height={height}
      currentTabId={currentTabId}
      setCurrentTabId={setCurrentTabId}
    >
      <MainContent
        width={0}
        height={0}
        nwbFile={nwbFile}
        usingLindi={usingLindi}
      />
      <ChatWindow
        width={0}
        height={0}
        chat={chat}
        chatDispatch={chatDispatch}
        openRouterKey={null}
        onLogMessage={undefined}
        onToggleLeftPanel={undefined}
        chatContext={chatContext}
      />
      {/* <ChatPanel
        width={0}
        height={0}
        chat={chat}
        setChat={setChat}
        availableResourceUrls={availableResourceUrls}
      /> */}
    </TabWidget>
  );
};

const MainContent: FunctionComponent<Props> = ({
  width,
  height,
  usingLindi,
  nwbFile,
}) => {
  const rootGroup = useGroup(nwbFile, "/");
  const generalGroup = useGroup(nwbFile, "/general");

  const { openTab } = useNwbOpenTabs();

  const items = useMemo(() => {
    const ret: {
      name: string;
      path: string;
      renderer?: (val: any) => string;
    }[] = [];
    rootGroup?.datasets.forEach((ds) => {
      const mm = leftPanelLabelMap.find((x) => x.name === ds.name);
      const newName = mm?.newName || ds.name;
      ret.push({
        name: newName || ds.name,
        path: ds.path,
        renderer: mm?.renderer,
      });
    });
    generalGroup?.datasets.forEach((ds) => {
      const mm = leftPanelLabelMap.find((x) => x.name === ds.name);
      const newName = mm?.newName || ds.name;
      ret.push({
        name: newName || ds.name,
        path: ds.path,
        renderer: mm?.renderer,
      });
    });
    return ret;
  }, [rootGroup, generalGroup]);

  const itemsSorted = useMemo(() => {
    const ret = [...items];
    ret.sort((a, b) => {
      const ind1 = leftPanelLabelMap.findIndex((x) => x.newName === a.name);
      const ind2 = leftPanelLabelMap.findIndex((x) => x.newName === b.name);
      if (ind1 >= 0) {
        if (ind2 < 0) return -1;
        return ind1 - ind2;
      }
      if (ind2 >= 0) {
        if (ind1 < 0) return 1;
        return ind1 - ind2;
      }
      return a.name.localeCompare(b.name);
    });
    return ret;
  }, [items]);

  const {
    visible: loadInPynwbVisible,
    handleOpen: openLoadInPynwb,
    handleClose: closeLoadInPynwb,
  } = useModalWindow();

  const bottomBarHeight = 23;
  return (
    <div className="LeftPanel" style={{ position: "absolute", width, height }}>
      <div
        className="MainArea"
        style={{
          position: "absolute",
          width,
          height: height - bottomBarHeight,
          overflowY: "auto",
        }}
      >
        <DandiTable />
        {usingLindi && (
          <div>
            <div style={{ color: "darkgreen", fontSize: 10 }}>Using LINDI</div>
            <hr />
          </div>
        )}
        <table className="nwb-table">
          <tbody>
            {itemsSorted.map((item) => (
              <tr key={item.name}>
                <td>{item.name}</td>
                <td>
                  <DatasetDataView
                    nwbFile={nwbFile}
                    path={item.path}
                    renderer={item.renderer}
                  />
                </td>
              </tr>
            ))}
            <tr>
              <td>NWB version</td>
              <td>{rootGroup?.attrs["nwb_version"] || "Loading..."}</td>
            </tr>
          </tbody>
        </table>
        <hr />
        <SelectedNeurodataItemsWidget />
      </div>
      <div
        style={{
          position: "absolute",
          width,
          height: bottomBarHeight,
          top: height - bottomBarHeight,
          backgroundColor: "lightgray",
        }}
      >
        <button
          onClick={() => {
            openTab("timeseries-alignment");
          }}
        >
          View timeseries alignment
        </button>
        &nbsp;
        <button
          onClick={() => {
            openLoadInPynwb();
          }}
        >
          Load in pynwb
        </button>
      </div>
      <ModalWindow visible={loadInPynwbVisible} onClose={closeLoadInPynwb}>
        <LoadInPynwbWindow />
      </ModalWindow>
    </div>
  );
};

type DatasetDataViewProps = {
  nwbFile: RemoteH5FileX;
  path: string;
  renderer?: (val: any) => string;
};

const DatasetDataView: FunctionComponent<DatasetDataViewProps> = ({
  nwbFile,
  path,
  renderer,
}) => {
  const { data: datasetData } = useDatasetData(nwbFile, path);
  if (datasetData === undefined) return <span>Loading...</span>;
  if (typeof datasetData === "string" && datasetData.length > 500) {
    return (
      <div style={{ height: 100, overflowY: "auto" }}>
        {renderer ? renderer(datasetData) : valueToString2(datasetData)}
      </div>
    );
  }
  return (
    <span>
      {renderer
        ? renderer(datasetData)
        : abbreviate(valueToString2(datasetData), 500)}
    </span>
  );
};

export const valueToString2 = (val: any): string => {
  // same as valueToString, but don't include the brackets for arrays
  if (typeof val === "string") {
    return val;
  } else if (typeof val === "number") {
    return val + "";
  } else if (typeof val === "boolean") {
    return val ? "true" : "false";
  } else if (typeof val === "object") {
    if (Array.isArray(val)) {
      return `${val.map((x) => valueToElement(x)).join(", ")}`;
    } else {
      return JSON.stringify(serializeBigInt(val));
    }
  } else {
    return "<>";
  }
};

const abbreviate = (str: string, maxLength: number) => {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};

// type DandiAssetInfo = {
//     dandiset_id: string
//     dandiset_version_id: string
//     dandi_asset_id: string
//     dandi_asset_path: string
//     dandi_asset_size: number
//     dandi_asset_blob_id: string
// }

export type DandisetInfo = {
  id: string;
  doi: string;
  url: string;
  name: string;
  // others
};

const DandiTable = () => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const { assetUrl, dandisetId, dandisetVersion, assetPath } =
    useDandiAssetContext();

  // const [dandiAssetInfo, setDandiAssetInfo] = useState<DandiAssetInfo | undefined>(undefined)

  // let nwbFileUrl: string
  // if (nwbFile instanceof MergedRemoteH5File) {
  //     nwbFileUrl = nwbFile.getFiles()[0].url
  // }
  // else {
  //     nwbFileUrl = nwbFile.url
  // }

  // useEffect(() => {
  //     const getDandiAssetInfo = async () => {
  //         const etag = await getEtag(nwbFileUrl)
  //         if (!etag) return
  //         const assetInfoUrl = `https://neurosift.org/computed/nwb/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/dandi_asset_info.1.json`
  //         const resp = await fetch(assetInfoUrl)
  //         if (!resp.ok) return
  //         const obj = await resp.json() as DandiAssetInfo
  //         setDandiAssetInfo(obj)
  //         const dandiInfoUrl = `https://api.dandiarchive.org/api/dandisets/${obj.dandiset_id}/versions/${obj.dandiset_version_id}/`
  //         const resp2 = await fetch(dandiInfoUrl)
  //         if (!resp2.ok) return
  //         const obj2 = await resp2.json() as DandisetInfo
  //         setDandisetInfo(obj2)
  //     }
  //     getDandiAssetInfo()
  // }, [nwbFileUrl])

  // if (!dandiAssetInfo) return <span />

  const staging = assetUrl.startsWith("https://api-staging.dandiarchive.org");
  const dandisetInfo = useDandisetInfo(dandisetId, dandisetVersion, staging);

  const assetPathParentPath = assetPath
    ? assetPath.split("/").slice(0, -1).join("/")
    : undefined;
  const assetPathFileName = assetPath
    ? assetPath.split("/").slice(-1)[0]
    : undefined;

  // const handleExportToDendro = useCallback(() => {
  //     const assetPathEncoded = encodeURIComponent(assetPath || '')
  //     const url = `https://dendro.vercel.app/importDandiAsset?projectName=D-${dandisetId}&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersion}&assetPath=${assetPathEncoded}&assetUrl=${assetUrl}`
  //     window.open(url, '_blank')
  // }, [dandisetId, dandisetVersion, assetPath, assetUrl])

  const { setRoute } = useRoute();

  useEffect(() => {
    if (!dandisetId) return;
    reportRecentlyViewedDandiset({
      dandisetId: dandisetId,
      dandisetVersion: dandisetVersion,
      title: dandisetInfo?.name || "",
      staging: staging,
    });
  }, [dandisetId, dandisetVersion, dandisetInfo, staging]);

  if (!dandisetId) return <span />;

  return (
    <div>
      {dandisetId && (
        <p>
          DANDISET:&nbsp;
          <Hyperlink
            onClick={() =>
              setRoute({
                page: "dandiset",
                dandisetId,
                dandisetVersion,
                staging,
              })
            }
            // href={`https://gui.dandiarchive.org/#/dandiset/${dandisetId}/${dandisetVersion}`}
            // target="_blank"
          >
            {dandisetId} {dandisetVersion}
          </Hyperlink>
          &nbsp;
        </p>
      )}
      {dandisetInfo && <p>{dandisetInfo.name}</p>}
      {dandisetId && dandisetVersion && assetPath && (
        <p>
          <Hyperlink
            href={`https://gui.dandiarchive.org/#/dandiset/${dandisetId}/${dandisetVersion}/files?location=${assetPathParentPath}`}
            target="_blank"
          >
            {assetPathParentPath}
          </Hyperlink>
          /{assetPathFileName}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "row" }}>
        <ViewObjectNotesIconThing objectPath="/" />
        &nbsp;
        <ViewObjectAnalysesIconThing objectPath="/" />
      </div>
    </div>
  );
};

export const useDandisetInfo = (
  dandisetId: string,
  dandisetVersion: string,
  staging: boolean,
) => {
  const [dandisetInfo, setDandisetInfo] = useState<DandisetInfo | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!dandisetId) return;
    if (!dandisetVersion) return;
    const getDandisetInfo = async () => {
      const baseUrl = staging
        ? "https://api-staging.dandiarchive.org"
        : "https://api.dandiarchive.org";
      const url = `${baseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}/`;
      const authorizationHeader = getAuthorizationHeaderForUrl(url);
      const headers = authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined;
      const resp = await fetch(url, { headers });
      if (!resp.ok) return;
      const obj = (await resp.json()) as DandisetInfo;
      setDandisetInfo(obj);
    };
    getDandisetInfo();
  }, [dandisetId, dandisetVersion, staging]);
  return dandisetInfo;
};

export const formatUserId = (userId: string) => {
  if (userId.startsWith("github|")) {
    return userId.slice("github|".length);
  } else {
    return userId;
  }
};

export default NwbMainLeftPanel;
