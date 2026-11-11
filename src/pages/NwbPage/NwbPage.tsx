import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Breadcrumbs, EmptyState, LoadingState } from "@ui";
import useRegisterNwbAIComponent from "./useRegisterNwbAIComponent";
import { useDandisetVersionInfo } from "../DandisetPage/useDandisetVersionInfo";
import useQueryDandiset from "../DandisetPage/useQueryDandiset";
import { addRecentDataset } from "../util/recentDatasets";
import MainWorkspace from "./MainWorkspace";
import FileOverview from "./FileOverview";
import "./FileViewer.css";
import { useElementSize } from "./useElementSize";
import { useStoredState } from "./useStoredState";
import { useAssetPath } from "./useAssetPath";
import { fileCrumbs } from "./fileCrumbs";
import FileError from "./components/FileError";
import { NwbFileOverview } from "./Types";
import { useNwbFileOverview } from "./useNwbFileOverview";
import { setCurrentDandisetId, setTryUsingLindi } from "@hdf5Interface";
import { toWithCurrentHash } from "./urlHash";

type NwbPageProps = {
  width: number;
  height: number;
  dandisetId?: string;
  nwbUrl?: string;
};

const NwbPage: FunctionComponent<NwbPageProps> = ({
  width,
  dandisetId: dandisetIdProp,
  nwbUrl: nwbUrlProp,
}) => {
  const [searchParams] = useSearchParams();
  // + gets converted to a space. Not sure how else to do this
  const nwbUrl =
    nwbUrlProp ||
    (searchParams.get("url")
      ? decodeURIComponent(searchParams.get("url") || "").replace(/ /g, "+")
      : "");
  const dandisetId = dandisetIdProp || searchParams.get("dandisetId");
  const dandisetVersion = searchParams.get("dandisetVersion") || "draft";
  const path = searchParams.get("path");
  const doNotTryLindi = searchParams.get("lindi") === "0";
  const [isLoadingAssetUrl, setIsLoadingAssetUrl] = useState(false);
  const navigate = useNavigate();

  const isEmber =
    nwbUrl?.startsWith("https://api-dandi.emberarchive.org/") || false;

  const dandiApiBaseUrl = !isEmber
    ? "https://api.dandiarchive.org"
    : "https://api-dandi.emberarchive.org";

  useEffect(() => {
    let canceled = false;

    const fetchAssetUrl = async () => {
      // If we already have a URL, or don't have necessary params, skip
      if (nwbUrl || !path || !dandisetId) return;

      setIsLoadingAssetUrl(true);
      try {
        const encodedPath = encodeURIComponent(path);
        const response = await fetch(
          `${dandiApiBaseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}/assets/?glob=${encodedPath}&metadata=false&zarr=false`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch asset details");
        }

        const data = await response.json();
        if (!canceled && data.results?.[0]?.asset_id) {
          const assetId = data.results[0].asset_id;
          const constructedUrl = `${dandiApiBaseUrl}/api/assets/${assetId}/download/`;

          navigate(toWithCurrentHash(`url=${constructedUrl}&${searchParams}`));
        }
      } catch (error) {
        console.error("Error fetching asset URL:", error);
      } finally {
        if (!canceled) {
          setIsLoadingAssetUrl(false);
        }
      }
    };

    fetchAssetUrl();
    return () => {
      canceled = true;
    };
  }, [
    dandisetId,
    dandisetVersion,
    path,
    nwbUrl,
    searchParams,
    navigate,
    dandiApiBaseUrl,
  ]);

  // Capture the tab to open exactly once, at mount. Reading it live would let
  // useSyncTabToUrl (which clears ?tab= while the default Widgets tab is still
  // active on first render) feed back in and cancel the initial tab's async
  // open before it finishes — so a deep link to a plugin view never opened.
  const [initialTabId] = useState(() => searchParams.get("tab"));

  // for looking up lindi files
  setCurrentDandisetId(dandisetId || "");
  setTryUsingLindi(!doNotTryLindi);

  useNwbPageAnalytics(nwbUrl, dandisetId, dandisetVersion);
  const { nwbFileOverview, error: fileError } = useNwbFileOverview(nwbUrl);

  useEffect(() => {
    if (dandisetId) {
      addRecentDataset("DANDI", dandisetId);
    }
  }, [dandisetId]);

  if (isLoadingAssetUrl)
    return <LoadingState label="Finding the file on DANDI" phase="loading" />;

  if (!nwbUrl)
    return (
      <EmptyState title="No file to open">
        Add an NWB file’s address to the link as ?url=, or open a file from a
        Dandiset.
      </EmptyState>
    );

  if (fileError) return <FileError nwbUrl={nwbUrl} error={fileError} />;

  return (
    <FileViewer
      nwbUrl={nwbUrl}
      nwbFileOverview={nwbFileOverview}
      dandisetId={dandisetId || undefined}
      dandisetVersion={dandisetVersion}
      useEmber={isEmber}
      narrow={width <= 768}
      initialTabId={initialTabId || undefined}
    />
  );
};

type FileViewerProps = {
  nwbUrl: string;
  nwbFileOverview: NwbFileOverview | null;
  dandisetId?: string;
  dandisetVersion: string;
  useEmber: boolean;
  narrow: boolean;
  initialTabId?: string;
};

/** The overview panel beside the workspace; the panel’s width and state are kept in this browser. */
const FileViewer: FunctionComponent<FileViewerProps> = ({
  nwbUrl,
  nwbFileOverview,
  dandisetId,
  dandisetVersion,
  useEmber,
  narrow,
  initialTabId,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workspace, size] = useElementSize<HTMLDivElement>();
  const [width, setWidth] = useStoredState("neurosift-overview-width", 320);
  const [collapsed, setCollapsed] = useStoredState(
    "neurosift-overview-collapsed",
    false,
  );
  const [narrowOpen, setNarrowOpen] = useState(false);
  const dandisetResponse = useQueryDandiset(dandisetId, false, useEmber);
  const dandisetVersionInfo = useDandisetVersionInfo(
    dandisetId,
    dandisetVersion,
    false,
    dandisetResponse || null,
    useEmber,
  );

  const availableVersions = useMemo(() => {
    if (!dandisetResponse) return [];
    const versions: { version: string; label: string }[] = [];
    if (dandisetResponse.most_recent_published_version) {
      const v = dandisetResponse.most_recent_published_version.version;
      versions.push({ version: v, label: v });
    }
    if (dandisetResponse.draft_version) {
      versions.push({ version: "draft", label: "draft (latest)" });
    }
    return versions;
  }, [dandisetResponse]);

  const handleVersionChange = useCallback(
    (version: string) => {
      const newParams = new URLSearchParams(searchParams);
      newParams.set("dandisetVersion", version);
      navigate(toWithCurrentHash(newParams), { replace: true });
    },
    [navigate, searchParams],
  );

  useRegisterNwbAIComponent({ nwbUrl, dandisetId, dandisetVersion });

  const assetPath = useAssetPath(nwbUrl);
  const crumbs = fileCrumbs({
    base: import.meta.env.BASE_URL,
    archive: dandisetId ? (useEmber ? "EMBER" : "DANDI") : undefined,
    dandisetId,
    assetPath,
    nwbUrl,
  });

  const panelOpen = narrow ? narrowOpen : !collapsed;
  return (
    <div className="file-viewer-frame">
      <div className="file-viewer-crumbs">
        <Breadcrumbs items={crumbs} />
      </div>
      <div
        className={
          narrow && panelOpen
            ? "file-viewer file-viewer--panel-only"
            : "file-viewer"
        }
      >
        <FileOverview
          nwbUrl={nwbUrl}
          nwbFileOverview={nwbFileOverview}
          dandisetInfo={dandisetVersionInfo}
          dandisetPath={
            dandisetId
              ? `/${useEmber ? "ember-dandiset" : "dandiset"}/${dandisetId}`
              : "/"
          }
          availableVersions={availableVersions}
          onVersionChange={handleVersionChange}
          width={width}
          onWidthChange={setWidth}
          collapsed={!panelOpen}
          onCollapsedChange={(c) =>
            narrow ? setNarrowOpen(!c) : setCollapsed(c)
          }
        />
        <div ref={workspace} className="file-viewer-workspace">
          {size.width > 0 && (
            <MainWorkspace
              nwbUrl={nwbUrl}
              width={size.width}
              height={size.height}
              initialTabId={initialTabId}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const useNwbPageAnalytics = (
  nwbUrl: string,
  dandisetId: string | null,
  dandisetVersion: string,
) => {
  useEffect(() => {
    // Avoid logging multiple times for the same NWB file
  }, [nwbUrl, dandisetId, dandisetVersion]);
};

export default NwbPage;
