import { FunctionComponent, useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ResponsiveLayout from "@components/ResponsiveLayout";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import DandisetOverview from "./DandisetOverview";
import { useDandisetVersionInfo } from "./useDandisetVersionInfo";
import useQueryDandiset from "./useQueryDandiset";
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
  const [searchParams] = useSearchParams();
  const effectiveDandisetId = propDandisetId || urlDandisetId;
  const staging = false;

  // Query the dandiset info
  const dandisetResponse = useQueryDandiset(
    effectiveDandisetId,
    staging,
    false,
  );
  const dandisetVersion = searchParams.get("dandisetVersion") || "";
  const dandisetVersionInfo = useDandisetVersionInfo(
    effectiveDandisetId,
    dandisetVersion || "",
    staging,
    dandisetResponse || null,
    false,
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

  const initialTabId = searchParams.get("tab");

  // Register AI component
  useRegisterAIComponent({
    dandisetId: effectiveDandisetId,
    dandisetVersionInfo,
    nwbFilesOwnlyControlVisible: true,
  });

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
      navigate(`?${newParams.toString()}`, { replace: true });
    },
    [navigate, searchParams],
  );

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
      <DandisetOverview
        width={0}
        height={0}
        dandisetVersionInfo={dandisetVersionInfo}
        availableVersions={availableVersions}
        onVersionChange={handleVersionChange}
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
