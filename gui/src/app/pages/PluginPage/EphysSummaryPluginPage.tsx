import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { OpenInNew } from "@mui/icons-material";
import {
  RemoteH5FileLindi,
  RemoteH5FileX,
  RemoteH5Group,
} from "neurosift-lib/remote-h5-file/index";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import useRoute from "neurosift-lib/contexts/useRoute";
import {
  AssetsResponseItem,
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/DandiBrowser/types";
import {
  assetUrlForPath,
  useDandisetVersionInfo,
  useQueryAssets,
  useQueryDandiset,
} from "../DandisetPage/DandisetViewFromDendro/DandisetView";
import { NwbFileContext } from "neurosift-lib/misc/NwbFileContext";
import { tryGetLindiUrl } from "../NwbPage/NwbPage";
import { LazyPlotlyPlotContext } from "neurosift-lib/viewPlugins/CEBRA/LazyPlotlyPlot";
import EphysSummaryItemView, {
  Expandable,
} from "neurosift-lib/viewPlugins/Ephys/EphysSummaryItemView";

type EphysSummaryPluginPageProps = {
  width: number;
  height: number;
};

const lazyPlotlyPlotContextValue = {
  showPlotEvenWhenNotVisible: true,
};

const EphysSummaryPluginPage: FunctionComponent<
  EphysSummaryPluginPageProps
> = ({ width, height }) => {
  const { route, setRoute } = useRoute();
  if (route.page !== "plugin")
    throw Error("Unexpected route for PluginPage: " + route.page);
  if (route.plugin !== "EphysSummary")
    throw Error("Unexpected plugin for PluginPage: " + route.plugin);
  const { dandisetId, dandisetVersion, staging: useStaging } = route;

  const dandisetResponse: DandisetSearchResultItem | null | undefined =
    useQueryDandiset(dandisetId, useStaging);
  const dandisetVersionInfo: DandisetVersionInfo | null =
    useDandisetVersionInfo(
      dandisetId,
      dandisetVersion || "",
      useStaging,
      dandisetResponse || null,
    );
  useEffect(() => {
    // put the version in the route
    if (
      !dandisetVersion &&
      dandisetVersionInfo &&
      dandisetVersionInfo.version
    ) {
      setRoute(
        {
          ...route,
          dandisetVersion: dandisetVersionInfo.version,
        },
        true,
      );
    }
  }, [dandisetVersion, dandisetVersionInfo, dandisetId, setRoute, route]);
  const [maxNumPages, setMaxNumPages] = useState(1);
  const { assetsResponses, incomplete } = useQueryAssets(
    dandisetId,
    maxNumPages,
    dandisetResponse || null,
    dandisetVersionInfo,
    useStaging,
  );
  const allAssets = useMemo(() => {
    if (!assetsResponses) return null;
    const rr: AssetsResponseItem[] = [];
    assetsResponses.forEach((assetsResponse) => {
      rr.push(...assetsResponse.results);
    });
    return rr;
  }, [assetsResponses]);
  const allEphysAssets = useMemo(
    () =>
      allAssets?.filter((a) => {
        if (!a.path.endsWith(".nwb")) return false;
        const tags = getTagsForAssetPath(a.path);
        if (!tags.includes("ecephys")) return false;
        return true;
      }),
    [allAssets],
  );

  return (
    <LazyPlotlyPlotContext.Provider value={lazyPlotlyPlotContextValue}>
      <div
        style={{
          position: "relative",
          left: 10,
          width: width - 20,
          height,
          overflow: "auto",
        }}
      >
        <h2>Ephys Summary for Dandiset {dandisetId}</h2>
        {incomplete && allAssets && (
          <div style={{ fontSize: 14, padding: 5 }}>
            <span style={{ color: "red" }}>
              Warning: only showing first {allAssets.length} assets.
            </span>
            &nbsp;
            <Hyperlink onClick={() => setMaxNumPages(maxNumPages + 2)}>
              Load more
            </Hyperlink>
          </div>
        )}
        {dandisetId &&
          allEphysAssets?.map((asset) => (
            <Expandable
              title={
                <>
                  {asset.path}
                  &nbsp;
                  <SmallIconButton
                    icon={<OpenInNew />}
                    onClick={() => {
                      setRoute({
                        page: "nwb",
                        url: [
                          assetUrlForPath(
                            asset.path,
                            allAssets || [],
                            useStaging,
                          ),
                        ],
                        dandisetId,
                        dandisetVersion,
                        dandiAssetId: asset.asset_id,
                        storageType: ["h5"],
                      });
                    }}
                  />
                </>
              }
              defaultExpanded={false}
              key={asset.asset_id}
            >
              <EphysSummaryAssetView
                key={asset.asset_id}
                width={width - 20}
                dandisetId={dandisetId}
                assetPath={asset.path}
                assetUrl={assetUrlForPath(
                  asset.path,
                  allAssets || [],
                  useStaging,
                )}
                assetId={asset.asset_id}
              />
            </Expandable>
          ))}
        {allEphysAssets && allEphysAssets.length === 0 && (
          <div style={{ padding: 5 }}>No ecephys assets found.</div>
        )}
      </div>
    </LazyPlotlyPlotContext.Provider>
  );
};

type EphysSummaryAssetViewProps = {
  width: number;
  dandisetId: string;
  assetPath: string;
  assetUrl: string;
  assetId: string;
};

const useLindiNwbUrl = (dandisetId: string, assetUrl: string) => {
  const [lindiNwbUrl, setLindiNwbUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    tryGetLindiUrl(assetUrl, dandisetId).then((url) => {
      setLindiNwbUrl(url);
    });
  }, [dandisetId, assetUrl]);
  return lindiNwbUrl;
};

const useLindiNwbFile = (lindiNwbUrl: string | undefined) => {
  const [nwbFile, setNwbFile] = useState<RemoteH5FileX | undefined>(undefined);
  useEffect(() => {
    if (!lindiNwbUrl) return;
    RemoteH5FileLindi.create(lindiNwbUrl).then((f) => {
      setNwbFile(f);
    });
  }, [lindiNwbUrl]);
  return nwbFile;
};

const useRawEphysPaths = (nwbFile: RemoteH5FileX | undefined) => {
  const [rawEphysPaths, setRawEphysPaths] = useState<string[] | undefined>(
    undefined,
  );
  useEffect(() => {
    if (!nwbFile) return;
    let canceled = false;
    (async () => {
      setRawEphysPaths(undefined);
      const a = await nwbFile.getGroup("acquisition");
      if (!a) return;
      const paths = [];
      for (const b of a.subgroups) {
        if (b.attrs["neurodata_type"] === "ElectricalSeries") {
          const g = await nwbFile.getGroup(b.path);
          if (!g) continue;
          const startTimeDs = g.datasets.find(
            (ds) => ds.name === "starting_time",
          );
          // todo: also support timestamps ds
          if (startTimeDs) {
            const rate = startTimeDs.attrs["rate"];
            if (rate >= 15000) {
              paths.push(b.path);
            }
          }
        }
      }
      if (canceled) return;
      setRawEphysPaths(paths);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);
  return rawEphysPaths;
};

const EphysSummaryAssetView: FunctionComponent<EphysSummaryAssetViewProps> = ({
  width,
  dandisetId,
  assetUrl,
}) => {
  const lindiNwbUrl = useLindiNwbUrl(dandisetId, assetUrl);
  const nwbFile = useLindiNwbFile(lindiNwbUrl);
  const rawEphysPaths = useRawEphysPaths(nwbFile);

  // TODO: deduplicate with NwbPage.tsx
  const [neurodataItems, setNeurodataItems] = useState<
    {
      path: string;
      neurodataType: string;
    }[]
  >([]);
  useEffect(() => {
    let canceled = false;
    setNeurodataItems([]);
    if (!nwbFile) return;
    (async () => {
      let allItems: {
        path: string;
        neurodataType: string;
      }[] = [];
      let timer = Date.now();
      const processGroup = async (group: RemoteH5Group) => {
        if (group.attrs.neurodata_type) {
          allItems = [
            ...allItems,
            { path: group.path, neurodataType: group.attrs.neurodata_type },
          ];
          const elapsed = Date.now() - timer;
          if (elapsed > 300) {
            timer = Date.now();
            setNeurodataItems(allItems);
          }
        }
        for (const subgroup of group.subgroups) {
          const sg = await nwbFile.getGroup(subgroup.path);
          if (sg) {
            await processGroup(sg);
          }
        }
      };
      const rootGroup = await nwbFile.getGroup("/");
      if (!rootGroup) return;
      await processGroup(rootGroup);
      setNeurodataItems(allItems);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFile]);

  if (!nwbFile) return <div>No nwbFile</div>;
  return (
    <div style={{ padding: 5 }}>
      {rawEphysPaths?.map((path) => (
        <div key={path}>
          <NwbFileContext.Provider value={{ nwbFile, neurodataItems }}>
            <EphysSummaryElectricalSeriesView
              width={width}
              electricalSeriesPath={path}
            />
          </NwbFileContext.Provider>
        </div>
      ))}
      {rawEphysPaths && rawEphysPaths.length === 0 && (
        <div>No raw ephys datasets found</div>
      )}
    </div>
  );
};

type EphsSummaryElectricalSeriesViewProps = {
  width: number;
  electricalSeriesPath: string;
};

const EphysSummaryElectricalSeriesView: FunctionComponent<
  EphsSummaryElectricalSeriesViewProps
> = ({ width, electricalSeriesPath }) => {
  return (
    <div>
      <h3>{electricalSeriesPath}</h3>
      <EphysSummaryItemView
        width={width}
        height={0} // 0 here means don't impose a height
        path={electricalSeriesPath}
        compact={true}
      />
    </div>
  );
};

const getTagsForAssetPath = (assetPath: string) => {
  // for example, with sub-ZYE-0031_ses-4_ecephys+image.nwb, return ['ecephys', 'image']
  // remove .nwb at end
  const p = assetPath.slice(0, -".nwb".length);
  const lastPart = p.split("_").slice(-1)[0]; // get last part after _
  return lastPart.split("+");
};

export default EphysSummaryPluginPage;
