import { FunctionComponent, useCallback, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "@components/ResponsiveLayout";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import EmberDandisetOverview from "./EmberDandisetOverview.tsx";
import { useEmberDandisetVersionInfo } from "./useEmberDandisetVersionInfo.ts";
import useQueryEmberDandiset from "./useQueryEmberDandiset.ts";
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
  const staging = false;

  // Query the dandiset info
  const dandisetResponse = useQueryEmberDandiset(effectiveDandisetId, staging);
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
    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          fontSize: "14px",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={nwbFilesOnly}
          onChange={(e) => setNwbFilesOnly(e.target.checked)}
        />
        Show NWB files only
      </label>
    </div>
  );

  const [searchParams] = useSearchParams();
  const initialTabId = searchParams.get("tab");

  // Register AI component
  useRegisterAIComponent({
    dandisetId: effectiveDandisetId,
    dandisetVersionInfo,
    nwbFilesOwnlyControlVisible: true,
  });
  
  if (loading || !dandisetResponse || !dandisetVersionInfo) {
    return <div>Loading...</div>;
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
