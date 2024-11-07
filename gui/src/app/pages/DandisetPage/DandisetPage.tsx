import Splitter from "neurosift-lib/components/Splitter";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
} from "react";
import useRoute from "neurosift-lib/contexts/useRoute";
import ChatWindow from "neurosift-lib/pages/ChatPage/ChatWindow";
import { getInitialSideChatWidth } from "../DandiPage/DandiPage";
import { DandiAssetContext } from "../NwbPage/DandiAssetContext";
import { SetupContextAnnotationsProvider } from "../NwbPage/NeurosiftAnnotations/useContextAnnotations";
import { useSavedChats } from "neurosift-lib/pages/SavedChatsPage/savedChatsApi";
import DandisetView from "./DandisetViewFromDendro/DandisetView";
import { ChatContext } from "neurosift-lib/pages/ChatPage/ChatContext";
import { chatReducer, emptyChat } from "neurosift-lib/pages/ChatPage/Chat";

type DandisetPageProps = {
  width: number;
  height: number;
  showChat?: boolean;
};

const DandisetPage: FunctionComponent<DandisetPageProps> = ({
  width,
  height,
  showChat,
}) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "dandiset")
    throw Error("Unexpected route for DandisetPage: " + route.page);

  const handleOpenAssets = useCallback(
    (assetUrls: string[], assetPaths: string[]) => {
      if (assetUrls.length > 5) {
        alert(
          `Cannot open more than 5 assets at once. You tried to open ${assetUrls.length}.`,
        );
        return;
      }
      setRoute({
        page: "nwb",
        dandisetId: route.dandisetId,
        dandisetVersion: route.dandisetVersion,
        url: assetUrls,
        storageType: assetPaths.map((p) => {
          if (p.endsWith(".json")) return "lindi";
          else return "h5";
        }),
      });
    },
    [route, setRoute],
  );
  const dandiAssetContextValue = useMemo(
    () => ({
      dandisetId: route.dandisetId,
      dandisetVersion: route.dandisetVersion || "",
      assetUrl: "",
    }),
    [route.dandisetId, route.dandisetVersion],
  );
  const initialSideChatWidth = getInitialSideChatWidth(width);
  const [chat, chatDispatch] = useReducer(chatReducer, emptyChat);
  const chatContext: ChatContext = useMemo(
    () => ({ type: "dandiset", dandisetId: route.dandisetId }),
    [route.dandisetId],
  );

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
    }
  }, [initialChat]);

  return (
    <DandiAssetContext.Provider value={dandiAssetContextValue}>
      <SetupContextAnnotationsProvider>
        <Splitter
          width={width}
          height={height}
          initialPosition={initialSideChatWidth}
          hideFirstChild={!showChat}
        >
          <ChatWindow
            width={0}
            height={0}
            chat={chat}
            chatDispatch={chatDispatch}
            openRouterKey={null}
            onLogMessage={undefined}
            chatContext={chatContext}
          />
          <DandisetView
            width={0}
            height={0}
            dandisetId={route.dandisetId}
            dandisetVersion={route.dandisetVersion}
            useStaging={!!route.staging}
            onOpenAssets={handleOpenAssets}
          />
        </Splitter>
      </SetupContextAnnotationsProvider>
    </DandiAssetContext.Provider>
  );
};

// type DandisetInfoTableProps = {
//     dandisetId: string
//     dandisetVersion: string
//     dandisetInfo?: DandisetInfo
// }

// const DandisetInfoTable: FunctionComponent<DandisetInfoTableProps> = ({dandisetInfo, dandisetId, dandisetVersion}) => {
//     return (
//         <div>
//             {dandisetId && (
//                 <p>
//                     DANDISET:&nbsp;
//                     <Hyperlink
//                         href={`https://gui.dandiarchive.org/#/dandiset/${dandisetId}/${dandisetVersion}`}
//                         target="_blank"
//                     >
//                         {dandisetId} {dandisetVersion}
//                     </Hyperlink>&nbsp;
//                 </p>
//             )}
//             {dandisetInfo && (
//                 <p>
//                     {dandisetInfo.name}
//                 </p>
//             )}
//             <hr />
//         </div>
//     )
// }

export default DandisetPage;
