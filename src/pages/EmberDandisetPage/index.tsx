import ResponsiveLayout from "@components/ResponsiveLayout";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import DatasetWorkspace from "../common/DatasetWorkspace/DatasetWorkspace";
import { DatasetFile } from "../common/DatasetWorkspace/plugins/pluginInterface";
import {
  AssetsResponseItem,
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/dandi-types";
import { addRecentDandiset } from "../util/recentDandisets";
import DandisetOverview from "./DandisetOverview";
import { useDandisetVersionInfo } from "./useDandisetVersionInfo";
import useQueryEmberAssets from "./useQueryEmberAssets.ts";
import useQueryEmberDandiset from "./useQueryEmberDandiset.ts";
import useRegisterAIComponent from "./useRegisterAIComponent";

type DandisetPageProps = {
  width: number;
  height: number;
  dandisetId?: string; // Optional prop to override the URL parameter
};

const DandisetPage: FunctionComponent<DandisetPageProps> = ({
  width,
  height,
  dandisetId: propDandisetId,
}) => {
  const navigate = useNavigate();
  const { dandisetId: urlDandisetId } = useParams();
  const effectiveDandisetId = propDandisetId || urlDandisetId;
  const staging = false;
  const dandisetResponse: DandisetSearchResultItem | undefined | null =
    useQueryEmberDandiset(effectiveDandisetId, staging);

  // todo: get dandisetVersion from the route
  const dandisetVersion = "";

  const dandisetVersionInfo: DandisetVersionInfo | null =
    useDandisetVersionInfo(
      effectiveDandisetId,
      dandisetVersion || "",
      staging,
      dandisetResponse || null,
    );

  // todo: set dandisetVersion to route if not there yet

  const [maxNumPages, setMaxNumPages] = useState(1);
  const [nwbFilesOnly, setNwbFilesOnly] = useState(false);

  const handleLoadMore = useCallback(() => {
    setMaxNumPages((prev) => prev * 2);
  }, []);
  const { assetsResponses, incomplete, totalCount } = useQueryEmberAssets(
    effectiveDandisetId,
    maxNumPages, // numPages parameter (using existing state variable)
    dandisetResponse || null,
    dandisetVersionInfo,
    staging,
    nwbFilesOnly,
  );
  const allAssets: AssetsResponseItem[] | null = useMemo(() => {
    if (!assetsResponses) return null;
    const rr: AssetsResponseItem[] = [];
    assetsResponses.forEach((assetsResponse) => {
      rr.push(...assetsResponse.results);
    });
    return rr;
  }, [assetsResponses]);

  useEffect(() => {
    if (effectiveDandisetId) {
      addRecentDandiset(effectiveDandisetId);
    }
  }, [effectiveDandisetId, staging]);

  const topLevelFiles: DatasetFile[] = useMemo(() => {
    if (!allAssets) return [];
    const topLevelFiles: DatasetFile[] = [];
    const directoriesHandled = new Set<string>();
    allAssets.forEach((asset) => {
      const parts = asset.path.split("/");
      if (parts.length === 1) {
        // file
        topLevelFiles.push({
          id: asset.asset_id,
          key: asset.asset_id,
          filename: asset.path,
          filepath: asset.path,
          parentId: "",
          size: asset.size,
          directory: false,
          urls: [
            `https://api.dandiarchive.org/api/assets/${asset.asset_id}/download/`,
          ],
        });
      } else {
        // directory
        const topLevelDir = parts[0];
        if (!directoriesHandled.has(topLevelDir)) {
          directoriesHandled.add(topLevelDir);
          topLevelFiles.push({
            id: topLevelDir,
            key: topLevelDir,
            filename: topLevelDir,
            filepath: topLevelDir,
            parentId: "",
            size: 0,
            directory: true,
            urls: [],
          });
        }
      }
    });
    return topLevelFiles;
  }, [allAssets]);

  const loadFileFromPath = useMemo(
    () =>
      async (
        filePath: string,
        parentId: string,
      ): Promise<DatasetFile | null> => {
        const asset = allAssets?.find((a) => a.path === filePath);
        if (!asset) return null;
        return {
          id: asset.asset_id,
          key: asset.asset_id,
          filename: asset.path,
          filepath: asset.path,
          parentId: parentId,
          size: asset.size,
          directory: false,
          urls: [
            `https://api.dandiarchive.org/api/assets/${asset.asset_id}/download/`,
          ],
        };
      },
    [allAssets],
  );

  const fetchDirectory = useMemo(
    () =>
      async (parent: DatasetFile): Promise<DatasetFile[]> => {
        if (!parent.directory) return [];
        const newFiles: DatasetFile[] = [];
        const handledSubdirectories = new Set<string>();
        allAssets?.forEach((asset) => {
          if (asset.path.startsWith(parent.filepath + "/")) {
            const p = asset.path.slice(parent.filepath.length + 1);
            const parts = p.split("/");
            if (parts.length === 1) {
              // file
              newFiles.push({
                id: asset.asset_id,
                key: asset.asset_id,
                filename: asset.path.split("/").pop() || "",
                filepath: asset.path,
                parentId: parent.id,
                size: asset.size,
                directory: false,
                urls: [
                  `https://api.dandiarchive.org/api/assets/${asset.asset_id}/download/`,
                ],
              });
            } else {
              // directory
              const subDir = parts[0];
              if (!handledSubdirectories.has(subDir)) {
                handledSubdirectories.add(subDir);
                newFiles.push({
                  id: parent.filepath + "/" + subDir,
                  key: parent.filepath + "/" + subDir,
                  filename: subDir,
                  filepath: parent.filepath + "/" + subDir,
                  parentId: parent.id,
                  size: 0,
                  directory: true,
                  urls: [],
                });
              }
            }
          }
        });
        return newFiles;
      },
    [allAssets],
  );

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

  const nwbFilesOwnlyControlVisible = useMemo(() => {
    // if nwbFilesOnly is true then we'll show the control
    if (nwbFilesOnly) return true;
    // if we have a partial list then we'll show the control
    if (incomplete) return true;
    // if none of the files are nwb then we do not show the control
    if (allAssets?.every((a) => !a.path.endsWith(".nwb"))) return false;
    // if some of the files are not NWB files then we'll show the control
    if (allAssets?.some((a) => !a.path.endsWith(".nwb"))) return true;
    // otherwise we don't show the control
    return false;
  }, [allAssets, nwbFilesOnly, incomplete]);

  const mainTabAdditionalControls = (
    <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
      {nwbFilesOwnlyControlVisible && (
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
      )}
      {incomplete && (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "14px" }}>
            {allAssets ? allAssets.length : 0} / {totalCount || "?"} files
          </span>
          <button
            onClick={handleLoadMore}
            style={{
              padding: "4px 12px",
              fontSize: "14px",
              cursor: "pointer",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
            }}
          >
            Load more files
          </button>
        </div>
      )}
    </div>
  );

  const [searchParams] = useSearchParams();
  const initialTabId = searchParams.get("tab");

  // Register AI component
  useRegisterAIComponent({
    dandisetId: effectiveDandisetId,
    dandisetVersionInfo,
    nwbFilesOwnlyControlVisible,
  });

  if (!dandisetResponse || !dandisetVersionInfo) {
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

export default DandisetPage;
