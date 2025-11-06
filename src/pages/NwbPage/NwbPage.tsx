import { Box, Tab, Tabs } from "@mui/material";
import { FunctionComponent, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useRegisterNwbAIComponent from "./useRegisterNwbAIComponent";
import ResponsiveLayout from "@components/ResponsiveLayout";
import ScrollY from "@components/ScrollY";
import { useDandisetVersionInfo } from "../DandisetPage/useDandisetVersionInfo";
import useQueryDandiset from "../DandisetPage/useQueryDandiset";
import { addRecentDandiset } from "../util/recentDandisets";
import MainWorkspace from "./MainWorkspace";
import NwbOverview from "./NwbOverview";
import "@css/NwbPage.css";
import { TAB_BAR_HEIGHT, tabsStyle, tabStyle } from "./tabStyles";
import { useNwbFileOverview } from "./useNwbFileOverview";
import { setCurrentDandisetId, setTryUsingLindi } from "@hdf5Interface";

type NwbPageProps = {
  width: number;
  height: number;
  dandisetId?: string;
  nwbUrl?: string;
};

const NwbPage: FunctionComponent<NwbPageProps> = ({
  width,
  height,
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

          navigate(`?url=${constructedUrl}&${searchParams}`);
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

  const initialTabId = searchParams.get("tab");

  // for looking up lindi files
  setCurrentDandisetId(dandisetId || "");
  setTryUsingLindi(!doNotTryLindi);

  const initialSplitterPosition = Math.max(200, Math.min(450, width / 3));

  useNwbPageAnalytics(nwbUrl, dandisetId, dandisetVersion);

  useEffect(() => {
    if (dandisetId) {
      addRecentDandiset(dandisetId);
    }
  }, [dandisetId]);

  if (isLoadingAssetUrl) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
      >
        <div>Loading NWB file URL...</div>
      </Box>
    );
  }

  if (!nwbUrl) {
    return "No NWB file URL provided.";
  }

  return (
    <ResponsiveLayout
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      mobileBreakpoint={768}
    >
      <LeftArea
        nwbUrl={nwbUrl || ""}
        width={0}
        height={0}
        dandisetId={dandisetId || undefined}
        dandisetVersion={dandisetVersion}
        useEmber={isEmber}
      />
      <MainWorkspace
        nwbUrl={nwbUrl}
        width={0}
        height={0}
        initialTabId={initialTabId || undefined}
      />
    </ResponsiveLayout>
  );
};

type LeftAreaProps = {
  nwbUrl: string;
  width: number;
  height: number;
  dandisetId?: string;
  dandisetVersion: string;
  useEmber: boolean;
};

const LeftArea: FunctionComponent<LeftAreaProps> = ({
  nwbUrl,
  width,
  height,
  dandisetId,
  dandisetVersion,
  useEmber,
}) => {
  const dandisetResponse = useQueryDandiset(dandisetId, false, useEmber);
  const dandisetVersionInfo = useDandisetVersionInfo(
    dandisetId,
    dandisetVersion,
    false,
    dandisetResponse || null,
    useEmber,
  );
  const { nwbFileOverview } = useNwbFileOverview(nwbUrl);
  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;

  useRegisterNwbAIComponent({
    nwbUrl,
    dandisetId,
    dandisetVersion,
  });

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width,
          height: tabBarHeight,
          left: 10,
          top: 12,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
          <Tabs value={0} sx={tabsStyle}>
            <Tab label="OVERVIEW" sx={tabStyle} />
          </Tabs>
        </Box>
      </div>

      <ScrollY
        width={width - 20}
        height={contentHeight}
        top={tabBarHeight}
        left={10}
      >
        <NwbOverview
          nwbFileOverview={nwbFileOverview}
          nwbUrl={nwbUrl}
          dandisetInfo={dandisetVersionInfo}
          width={width - 20}
        />
      </ScrollY>
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
