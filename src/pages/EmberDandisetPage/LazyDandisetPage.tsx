import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { Checkbox, LoadingState } from "@ui";
import { addRecentDataset } from "../util/recentDatasets";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "@components/ResponsiveLayout";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import EmberDandisetOverview from "./EmberDandisetOverview.tsx";
import { useEmberDandisetVersionInfo } from "./useEmberDandisetVersionInfo.ts";
import DandisetError from "../DandisetPage/DandisetError";
import { useDandisetResult } from "../DandisetPage/useQueryDandiset";
import useLazyDandisetPaths from "./hooks/useLazyDandisetPaths";
import useRegisterAIComponent from "./useRegisterAIComponent";

type LazyDandisetPageProps = {
  width: number;
  height: number;
  dandisetId?: string;
};

const LazyDandisetPage: FunctionComponent<LazyDandisetPageProps> = ({
  width,
  height,
  dandisetId: propDandisetId,
}) => {
  const navigate = useNavigate();
  const { dandisetId: urlDandisetId } = useParams();
  const effectiveDandisetId = propDandisetId || urlDandisetId;

  useEffect(() => {
    if (effectiveDandisetId) addRecentDataset("EMBER", effectiveDandisetId);
  }, [effectiveDandisetId]);
  const staging = false;

  // Query the dandiset info
  const { dandiset: dandisetResponse, failure } = useDandisetResult(
    effectiveDandisetId,
    staging,
    true,
  );
  const dandisetVersion = "";
  const dandisetVersionInfo = useEmberDandisetVersionInfo(
    effectiveDandisetId,
    dandisetVersion || "",
    staging,
    dandisetResponse || null,
  );

  // State for NWB files filter
  const [nwbFilesOnly, setNwbFilesOnly] = useState(false);

  // Use lazy loading hook
  const { topLevelFiles, loadFileFromPath, fetchDirectory, loading } =
    useLazyDandisetPaths(
      effectiveDandisetId,
      dandisetVersionInfo,
      staging,
      nwbFilesOnly,
    );

  // Special handler for NWB files
  const specialOpenFileHandler = useCallback(
    (file: DatasetFile) => {
      if (file.filepath.endsWith(".nwb")) {
        navigate(
          `/nwb?url=${file.urls[0]}&dandisetId=${effectiveDandisetId}&dandisetVersion=${dandisetVersionInfo?.version}`,
        );
        return true;
      }
      return false;
    },
    [effectiveDandisetId, dandisetVersionInfo, navigate],
  );

  // Controls for the main tab
  const mainTabAdditionalControls = (
    <Checkbox
      label="Show NWB files only"
      checked={nwbFilesOnly}
      onChange={setNwbFilesOnly}
    />
  );

  const [searchParams] = useSearchParams();
  const initialTabId = searchParams.get("tab");

  // Register AI component
  useRegisterAIComponent({
    dandisetId: effectiveDandisetId,
    dandisetVersionInfo,
    nwbFilesOwnlyControlVisible: true,
  });

  if (failure && effectiveDandisetId) {
    return <DandisetError dandisetId={effectiveDandisetId} failure={failure} />;
  }
  if (loading || !dandisetResponse || !dandisetVersionInfo) {
    return <LoadingState label="Loading the Dandiset" phase="loading" />;
  }

  const initialSplitterPosition = Math.max(500, Math.min(650, (width * 2) / 5));

  return (
    <ResponsiveLayout
      width={width}
      height={height}
      initialSplitterPosition={initialSplitterPosition}
      mobileBreakpoint={768}
    >
      <EmberDandisetOverview
        width={0}
        height={0}
        dandisetVersionInfo={dandisetVersionInfo}
      />
      <DatasetWorkspace
        width={0}
        height={0}
        topLevelFiles={topLevelFiles}
        initialTab={initialTabId}
        loadFileFromPath={loadFileFromPath}
        fetchDirectory={fetchDirectory}
        specialOpenFileHandler={specialOpenFileHandler}
        mainTabAdditionalControls={mainTabAdditionalControls}
      />
    </ResponsiveLayout>
  );
};

export default LazyDandisetPage;
