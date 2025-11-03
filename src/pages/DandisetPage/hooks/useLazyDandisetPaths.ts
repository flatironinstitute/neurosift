import { useCallback, useEffect, useState } from "react";
import getAuthorizationHeaderForUrl from "../../util/getAuthorizationHeaderForUrl";
import { DatasetFile } from "../../common/DatasetWorkspace/plugins/pluginInterface";
import { DandisetVersionInfo } from "../../DandiPage/dandi-types";

// Cache for storing loaded directories
interface CachedDirectory {
  path: string;
  files: DatasetFile[];
  timestamp: number;
}

interface CacheKey {
  dandisetId: string;
  version: string;
  isStaging: boolean;
  nwbFilesOnly: boolean;
}

interface CacheValue {
  directories: CachedDirectory[];
}

const globalDirectoryCache = new Map<string, CacheValue>();

const getCacheKey = (key: CacheKey): string => {
  return `${key.dandisetId}:${key.version}:${key.isStaging}:${key.nwbFilesOnly}`;
};

interface DandiPathResponse {
  count: number;
  results: {
    path: string;
    version: number;
    aggregate_files: number;
    aggregate_size: number;
    asset: {
      asset_id: string;
      url: string;
    } | null;
  }[];
}

export const useLazyDandisetPaths = (
  dandisetId: string | undefined,
  dandisetVersionInfo: DandisetVersionInfo | null,
  staging: boolean,
  nwbFilesOnly: boolean = false,
) => {
  const [topLevelFiles, setTopLevelFiles] = useState<DatasetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get authorization header
  const stagingStr = staging ? ".sandbox" : "";
  const baseUrl = `https://api${stagingStr}.dandiarchive.org/api/dandisets`;
  const authorizationHeader = getAuthorizationHeaderForUrl(baseUrl);
  const headers = authorizationHeader
    ? { Authorization: authorizationHeader }
    : undefined;

  // Convert API response to DatasetFile format
  const convertPathToFile = (
    item: DandiPathResponse["results"][0],
    parentId: string,
  ): DatasetFile => {
    const parts = item.path.split("/");
    const filename = parts[parts.length - 1];
    const isDirectory = item.asset === null;

    return {
      id: isDirectory ? item.path : item.asset?.asset_id || item.path,
      key: item.path,
      filename,
      filepath: item.path,
      parentId,
      size: item.aggregate_size,
      directory: isDirectory,
      urls: isDirectory
        ? []
        : [
            `https://api${stagingStr}.dandiarchive.org/api/assets/${item.asset?.asset_id}/download/`,
          ],
    };
  };

  // Function to fetch directory contents
  const fetchDirectoryContents = useCallback(
    async (pathPrefix: string = "") => {
      if (!dandisetId || !dandisetVersionInfo) return [];

      const globFilter = nwbFilesOnly ? "&glob=*.nwb*" : "";
      const encodedPrefix = encodeURIComponent(
        pathPrefix ? pathPrefix + "/" : "",
      );
      const url = `${baseUrl}/${dandisetId}/versions/${dandisetVersionInfo.version}/assets/paths/?page=1&page_size=1000&path_prefix=${encodedPrefix}${globFilter}`;

      try {
        const response = await fetch(url, { headers });
        if (!response.ok) throw new Error("Failed to fetch directory contents");

        const data: DandiPathResponse = await response.json();
        return data.results;
      } catch (err) {
        console.error("Error fetching directory:", err);
        return [];
      }
    },
    [dandisetId, dandisetVersionInfo, headers, nwbFilesOnly, stagingStr],
  );

  // Load initial top-level files
  useEffect(() => {
    const loadTopLevel = async () => {
      if (!dandisetId || !dandisetVersionInfo) return;

      setLoading(true);
      setError(null);

      try {
        const cacheKey = getCacheKey({
          dandisetId,
          version: dandisetVersionInfo.version,
          isStaging: staging,
          nwbFilesOnly,
        });

        // Check cache first
        const cache = globalDirectoryCache.get(cacheKey);
        const rootCache = cache?.directories.find((d) => d.path === "");
        if (rootCache) {
          setTopLevelFiles(rootCache.files);
          setLoading(false);
          return;
        }

        const results = await fetchDirectoryContents();
        const files = results.map((item) => convertPathToFile(item, ""));

        // Update cache
        if (!globalDirectoryCache.has(cacheKey)) {
          globalDirectoryCache.set(cacheKey, { directories: [] });
        }
        globalDirectoryCache.get(cacheKey)!.directories.push({
          path: "",
          files,
          timestamp: Date.now(),
        });

        setTopLevelFiles(files);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load directory",
        );
      } finally {
        setLoading(false);
      }
    };

    loadTopLevel();
  }, [
    dandisetId,
    dandisetVersionInfo,
    staging,
    nwbFilesOnly,
    fetchDirectoryContents,
  ]);

  // Function to fetch a specific file by path
  const loadFileFromPath = useCallback(
    async (filePath: string, parentId: string): Promise<DatasetFile | null> => {
      if (!dandisetId || !dandisetVersionInfo) return null;

      try {
        const pathPrefix = filePath.split("/").slice(0, -1).join("/");
        const results = await fetchDirectoryContents(pathPrefix);
        const matchingResult = results.find((r) => r.path === filePath);
        if (!matchingResult) return null;

        return convertPathToFile(matchingResult, parentId);
      } catch (err) {
        console.error("Error loading file:", err);
        return null;
      }
    },
    [dandisetId, dandisetVersionInfo, fetchDirectoryContents],
  );

  // Function to fetch directory contents
  const fetchDirectory = useCallback(
    async (parent: DatasetFile): Promise<DatasetFile[]> => {
      if (!parent.directory) return [];

      const cacheKey = getCacheKey({
        dandisetId: dandisetId || "",
        version: dandisetVersionInfo?.version || "",
        isStaging: staging,
        nwbFilesOnly,
      });

      // Check cache first
      const cache = globalDirectoryCache.get(cacheKey);
      const dirCache = cache?.directories.find(
        (d) => d.path === parent.filepath,
      );
      if (dirCache) {
        return dirCache.files;
      }

      const results = await fetchDirectoryContents(parent.filepath);
      const files = results.map((item) => convertPathToFile(item, parent.id));

      // Update cache
      if (!globalDirectoryCache.has(cacheKey)) {
        globalDirectoryCache.set(cacheKey, { directories: [] });
      }
      globalDirectoryCache.get(cacheKey)!.directories.push({
        path: parent.filepath,
        files,
        timestamp: Date.now(),
      });

      return files;
    },
    [
      dandisetId,
      dandisetVersionInfo,
      staging,
      nwbFilesOnly,
      fetchDirectoryContents,
    ],
  );

  return {
    topLevelFiles,
    loadFileFromPath,
    fetchDirectory,
    loading,
    error,
  };
};

export default useLazyDandisetPaths;
