import { useCallback, useEffect, useMemo, useState } from "react";
import getAuthorizationHeaderForUrl from "../../util/getAuthorizationHeaderForUrl";
import { DatasetFile } from "../../common/DatasetWorkspace/plugins/pluginInterface";
import { DandisetVersionInfo } from "../../DandiPage/dandi-types";
import { FetchPageError, fetchAllPages } from "../../util/fetchAllPages";

type DandiPathItem = {
  path: string;
  version: number;
  aggregate_files: number;
  aggregate_size: number;
  asset: { asset_id: string; url: string } | null;
};

// Folders already listed, by archive, Dandiset, version and filter, then by path.
const globalDirectoryCache = new Map<string, Map<string, DatasetFile[]>>();

export const dandiApiBase = (staging: boolean) =>
  `https://api${staging ? ".sandbox" : ""}.dandiarchive.org/api`;

/** Lists a Dandiset's folders a level at a time, from DANDI or another DANDI archive such as EMBER. */
export const useLazyDandisetPaths = (
  dandisetId: string | undefined,
  dandisetVersionInfo: DandisetVersionInfo | null,
  staging: boolean,
  nwbFilesOnly: boolean = false,
  apiBase: string = dandiApiBase(staging),
) => {
  const [topLevelFiles, setTopLevelFiles] = useState<DatasetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = `${apiBase}/dandisets`;
  const authorizationHeader = getAuthorizationHeaderForUrl(baseUrl);
  const headers = useMemo(
    () =>
      authorizationHeader ? { Authorization: authorizationHeader } : undefined,
    [authorizationHeader],
  );
  const version = dandisetVersionInfo?.version;

  const convertPathToFile = useCallback(
    (item: DandiPathItem, parentId: string): DatasetFile => {
      const isDirectory = item.asset === null;
      return {
        id: isDirectory ? item.path : item.asset?.asset_id || item.path,
        key: item.path,
        filename: item.path.split("/").pop() ?? item.path,
        filepath: item.path,
        parentId,
        size: item.aggregate_size,
        directory: isDirectory,
        urls: isDirectory
          ? []
          : [`${apiBase}/assets/${item.asset?.asset_id}/download/`],
      };
    },
    [apiBase],
  );

  // The entries directly inside one folder; throws when the request fails.
  const fetchPathListing = useCallback(
    async (pathPrefix: string) => {
      const globFilter = nwbFilesOnly ? "&glob=*.nwb*" : "";
      const encodedPrefix = encodeURIComponent(
        pathPrefix ? pathPrefix + "/" : "",
      );
      const url = `${baseUrl}/${dandisetId}/versions/${version}/assets/paths/?page=1&page_size=1000&path_prefix=${encodedPrefix}${globFilter}`;
      // Follow every page: a folder can hold more than one page of entries.
      return fetchAllPages<DandiPathItem>(url, headers);
    },
    [baseUrl, dandisetId, version, headers, nwbFilesOnly],
  );

  /** One folder's contents by its path, "" for the top level; null if there is no such folder. */
  const fetchFolder = useCallback(
    async (path: string): Promise<DatasetFile[] | null> => {
      if (!dandisetId || !version) return null;
      const cacheKey = `${apiBase}:${dandisetId}:${version}:${nwbFilesOnly}`;
      const cache = globalDirectoryCache.get(cacheKey) ?? new Map();
      globalDirectoryCache.set(cacheKey, cache);
      const cached = cache.get(path);
      if (cached) return cached;
      try {
        const results = await fetchPathListing(path);
        const files = results.map((item) => convertPathToFile(item, path));
        cache.set(path, files);
        return files;
      } catch (err) {
        if (err instanceof FetchPageError && err.status === 404) return null;
        throw err;
      }
    },
    [
      apiBase,
      dandisetId,
      version,
      nwbFilesOnly,
      fetchPathListing,
      convertPathToFile,
    ],
  );

  useEffect(() => {
    if (!dandisetId || !version) return;
    let canceled = false;
    setLoading(true);
    setError(null);
    fetchFolder("")
      .then((files) => {
        if (!canceled) setTopLevelFiles(files ?? []);
      })
      .catch((err) => {
        console.error("Error fetching directory:", err);
        if (canceled) return;
        setTopLevelFiles([]);
        setError(
          err instanceof Error ? err.message : "Failed to load directory",
        );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, [dandisetId, version, fetchFolder]);

  const loadFileFromPath = useCallback(
    async (filePath: string, parentId: string): Promise<DatasetFile | null> => {
      if (!dandisetId || !version) return null;
      try {
        const pathPrefix = filePath.split("/").slice(0, -1).join("/");
        const results = await fetchPathListing(pathPrefix);
        const match = results.find((r) => r.path === filePath);
        return match ? convertPathToFile(match, parentId) : null;
      } catch (err) {
        console.error("Error loading file:", err);
        return null;
      }
    },
    [dandisetId, version, fetchPathListing, convertPathToFile],
  );

  const fetchDirectory = useCallback(
    async (parent: DatasetFile): Promise<DatasetFile[]> => {
      if (!parent.directory) return [];
      try {
        return (await fetchFolder(parent.filepath)) ?? [];
      } catch (err) {
        console.error("Error fetching directory:", err);
        return [];
      }
    },
    [fetchFolder],
  );

  return {
    topLevelFiles,
    loadFileFromPath,
    fetchDirectory,
    fetchFolder,
    loading,
    error,
  };
};

export default useLazyDandisetPaths;
