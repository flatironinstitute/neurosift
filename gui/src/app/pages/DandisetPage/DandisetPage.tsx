import { useContextChat } from "app/ContextChat/ContextChat";
import { FunctionComponent, useCallback, useEffect, useMemo } from "react";
import useRoute from "../../useRoute";
import { DandiAssetContext } from "../NwbPage/DandiAssetContext";
import { SetupContextAnnotationsProvider } from "../NwbPage/NeurosiftAnnotations/useContextAnnotations";
import DandisetView from "./DandisetViewFromDendro/DandisetView";

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

  const { setContextString } = useContextChat();
  useEffect(() => {
    setContextString(
      "dandiset-page",
      `
The user is viewing a particular Dandiset, which contains a list of assets, or NWB files.
This is Dandiset ${route.dandisetId} version ${route.dandisetVersion}.
The user can expand the folder tree to see the assets in each folder.
Use can click on an asset link to view the contents of that particular NWB file.
If user clicks on the main link, which is the title of the Dandiset, they are taken to that Dandiset's page on the main DANDI Archive site (https://dandiarchive.org).
There is also a "Similar dandisets" section which shows other Dandisets that are similar to the current one.
`,
    );
    return () => {
      setContextString("dandiset-page", undefined);
    };
  }, [setContextString, route.dandisetId, route.dandisetVersion]);

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
  return (
    <DandiAssetContext.Provider value={dandiAssetContextValue}>
      <SetupContextAnnotationsProvider>
        <DandisetView
          width={width}
          height={height}
          dandisetId={route.dandisetId}
          dandisetVersion={route.dandisetVersion}
          useStaging={!!route.staging}
          onOpenAssets={handleOpenAssets}
        />
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
