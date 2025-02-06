import { Box, Tab, Tabs } from "@mui/material";
import { FunctionComponent, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ResponsiveLayout from "../../components/ResponsiveLayout";
import ScrollY from "../../components/ScrollY";
import { useDandisetVersionInfo } from "../DandisetPage/useDandisetVersionInfo";
import useQueryDandiset from "../DandisetPage/useQueryDandiset";
import MainWorkspace from "./MainWorkspace";
import NwbOverview from "./NwbOverview";
import "../../css/NwbPage.css";
import { TAB_BAR_HEIGHT, tabsStyle, tabStyle } from "./tabStyles";
import { useNwbFileOverview } from "./useNwbFileOverview";
import { track } from "@vercel/analytics/react";

type NwbPageProps = {
  width: number;
  height: number;
};

const NwbPage: FunctionComponent<NwbPageProps> = ({ width, height }) => {
  const [searchParams] = useSearchParams();
  const nwbUrl = searchParams.get("url") || "";
  const initialTabId = searchParams.get("tab");
  const dandisetId = searchParams.get("dandisetId");
  const dandisetVersion = searchParams.get("dandisetVersion") || "";

  const initialSplitterPosition = Math.max(200, Math.min(450, width / 3));

  useEffect(() => {
    let canceled = false;

    // important to only call this once per route change
    setTimeout(() => {
      if (canceled) return;
      // important to wait until the analytics is ready
      track("nwb-page-viewed", {
        url: nwbUrl || "",
        dandisetId: dandisetId || "",
        dandisetVersion: dandisetVersion || "",
      });
    }, 500);
    return () => {
      canceled = true;
    };
  }, [nwbUrl, dandisetId, dandisetVersion]);

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
};

const LeftArea: FunctionComponent<LeftAreaProps> = ({
  nwbUrl,
  width,
  height,
  dandisetId,
  dandisetVersion,
}) => {
  const dandisetResponse = useQueryDandiset(dandisetId, false);
  const dandisetVersionInfo = useDandisetVersionInfo(
    dandisetId,
    dandisetVersion,
    false,
    dandisetResponse || null,
  );
  const nwbFileOverview = useNwbFileOverview(nwbUrl);
  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;
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
        />
      </ScrollY>
    </div>
  );
};

export default NwbPage;
