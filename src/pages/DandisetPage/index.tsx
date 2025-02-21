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
import useQueryAssets from "./useQueryAssets";
import useQueryDandiset from "./useQueryDandiset";
import { AIComponentCallback, useAIComponentRegistry } from "../../AIContext";

type DandisetPageProps = {
  width: number;
  height: number;
};

const DandisetPage: FunctionComponent<DandisetPageProps> = ({
  width,
  height,
}) => {
  const navigate = useNavigate();
  const { dandisetId } = useParams();
  const [searchParams] = useSearchParams();
  const staging = false;
  const dandisetResponse: DandisetSearchResultItem | undefined | null =
    useQueryDandiset(dandisetId, staging);

  // todo: get dandisetVersion from the route
  const dandisetVersion = "";

  const dandisetVersionInfo: DandisetVersionInfo | null =
    useDandisetVersionInfo(
      dandisetId,
      dandisetVersion || "",
      staging,
      dandisetResponse || null,
    );

  // todo: set dandisetVersion to route if not there yet

  const [maxNumPages] = useState(1);
  const [nwbFilesOnly, setNwbFilesOnly] = useState(false);
  const { assetsResponses, incomplete } = useQueryAssets(
    dandisetId,
    maxNumPages,
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
    if (dandisetId) {
      addRecentDandiset(dandisetId);
    }
  }, [dandisetId, staging]);

  // Register AI component
  useRegisterAIComponent({
    dandisetId,
    dandisetVersionInfo,
    allAssets,
    nwbFilesOnly,
    setNwbFilesOnly,
    incomplete,
  });

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
          `/nwb?url=${file.urls[0]}&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersionInfo?.version}`,
        );
        return true;
      }
      return false;
    },
    [dandisetId, dandisetVersionInfo, navigate],
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

  const mainTabAdditionalControls = nwbFilesOwnlyControlVisible ? (
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
  ) : undefined;

  if (!dandisetResponse || !dandisetVersionInfo) {
    return <div>Loading...</div>;
  }

  const initialSplitterPosition = Math.max(500, Math.min(650, (width * 2) / 5));
  const tabFilePath = searchParams.get("tab");

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
        incomplete={incomplete}
        numFilesLoaded={allAssets ? allAssets.length : 0}
      />
      <DatasetWorkspace
        width={0}
        height={0}
        topLevelFiles={topLevelFiles}
        initialTab={tabFilePath}
        loadFileFromPath={loadFileFromPath}
        fetchDirectory={fetchDirectory}
        specialOpenFileHandler={specialOpenFileHandler}
        mainTabAdditionalControls={mainTabAdditionalControls}
      />
    </ResponsiveLayout>
  );
};

const useRegisterAIComponent = ({
  dandisetId,
  dandisetVersionInfo,
  allAssets,
  nwbFilesOnly,
  setNwbFilesOnly,
  incomplete,
}: {
  dandisetId: string | undefined;
  dandisetVersionInfo: DandisetVersionInfo | null;
  allAssets: AssetsResponseItem[] | null;
  nwbFilesOnly: boolean;
  setNwbFilesOnly: (value: boolean) => void;
  incomplete: boolean;
}) => {
  const { registerComponentForAI, unregisterComponentForAI } =
    useAIComponentRegistry();
  const navigate = useNavigate();
  useEffect(() => {
    const context = {
      dandisetId,
      dandisetVersion: dandisetVersionInfo?.version,
      numFiles: allAssets?.length || 0,
      hasNwbFiles: allAssets?.some((a) => a.path.endsWith(".nwb")) || false,
      nwbFilesOnly,
      incomplete,
      files: allAssets
        ?.map((a) => ({
          path: a.path,
          size: a.size,
        }))
        .slice(0, 50), // only send the first 50 files
    };
    const registration = {
      id: "DandisetPage",
      context,
      callbacks: [
        {
          id: "toggle_nwb_files_only",
          description:
            "Toggle showing only NWB files in the dataset. This is useful when you want to focus on just the NWB files in a large dataset.",
          parameters: {
            show_only_nwb: {
              type: "boolean",
              description: "Whether to show only NWB files",
              required: true,
            },
          },
          callback: (parameters: { show_only_nwb: boolean }) => {
            setNwbFilesOnly(parameters.show_only_nwb);
          },
        } as AIComponentCallback,
        {
          id: "open_nwb_file",
          description: "Open an NWB file in the dataset for viewing.",
          parameters: {
            file_path: {
              type: "string",
              description: "The path of the file to open",
              required: true,
            },
          },
          callback: (parameters: { file_path: string }) => {
            const file = allAssets?.find(
              (a) => a.path === parameters.file_path,
            );
            if (file && file.path.endsWith(".nwb")) {
              navigate(
                `/nwb?url=https://api.dandiarchive.org/api/assets/${file.asset_id}/download/&dandisetId=${dandisetId}&dandisetVersion=${dandisetVersionInfo?.version || "draft"}`,
              );
            }
          },
        } as AIComponentCallback,
      ],
    };
    registerComponentForAI(registration);
    return () => unregisterComponentForAI("DandisetPage");
  }, [
    registerComponentForAI,
    unregisterComponentForAI,
    dandisetId,
    dandisetVersionInfo,
    allAssets,
    nwbFilesOnly,
    incomplete,
    setNwbFilesOnly,
    navigate,
  ]);
};

export default DandisetPage;
