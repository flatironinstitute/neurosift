import { useContextChat } from "app/ContextChat/ContextChat";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import useRoute from "../../useRoute";
import { DandiAssetContext } from "../NwbPage/DandiAssetContext";
import { SetupContextAnnotationsProvider } from "../NwbPage/NeurosiftAnnotations/useContextAnnotations";
import DandisetView from "./DandisetViewFromDendro/DandisetView";
import { getInitialSideChatWidth } from "../DandiPage/DandiPage";
import ChatPanel, { Chat, emptyChat } from "app/ChatPanel/ChatPanel";
import Splitter from "app/Splitter/Splitter";

type DandisetPageProps = {
  width: number;
  height: number;
};

const DandisetPage: FunctionComponent<DandisetPageProps> = ({
  width,
  height,
}) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "dandiset")
    throw Error("Unexpected route for DandisetPage: " + route.page);

  const { setContextItem } = useContextChat();
  useEffect(() => {
    setContextItem("dandiset-page", {
      content: `
The user is viewing a particular Dandiset, which contains a list of assets, or NWB files.
This is Dandiset ${route.dandisetId} version ${route.dandisetVersion}.
User can expand the folder tree to see the assets in each folder.
User can click on an asset link to view the contents of that particular NWB file.
If user clicks on the main link, which is the title of the Dandiset, they are taken to that Dandiset's page on the main DANDI Archive site (https://dandiarchive.org).
There is also a "Similar dandisets" section which shows other Dandisets that are similar to the current one.
`,
    });
    return () => {
      setContextItem("dandiset-page", undefined);
    };
  }, [setContextItem, route.dandisetId, route.dandisetVersion]);

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
  const [chat, setChat] = useState<Chat>(emptyChat);
  return (
    <DandisetView
      width={width}
      height={height}
      dandisetId={route.dandisetId}
      dandisetVersion={route.dandisetVersion}
      useStaging={!!route.staging}
      onOpenAssets={handleOpenAssets}
    />
  );
  // return (
  //   <DandiAssetContext.Provider value={dandiAssetContextValue}>
  //     <SetupContextAnnotationsProvider>
  //       <Splitter
  //         width={width}
  //         height={height}
  //         initialPosition={initialSideChatWidth}
  //       >
  //         <ChatPanel width={0} height={0} chat={chat} setChat={setChat} />
  //         <DandisetView
  //           width={0}
  //           height={0}
  //           dandisetId={route.dandisetId}
  //           dandisetVersion={route.dandisetVersion}
  //           useStaging={!!route.staging}
  //           onOpenAssets={handleOpenAssets}
  //         />
  //       </Splitter>
  //     </SetupContextAnnotationsProvider>
  //   </DandiAssetContext.Provider>
  // );
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
