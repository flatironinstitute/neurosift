import {
  getHdf5DatasetData,
  getHdf5Group,
  Hdf5Group,
  isDandiAssetUrl,
} from "./hdf5Interface";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

export type ExternalVideoCandidate = {
  path: string;
  name: string;
  externalFile: string;
  startTime: number;
  endTime: number;
};

const assetPathCache = new Map<string, Promise<string>>();
const resolvedVideoUrlCache = new Map<string, Promise<string>>();

/** Unwraps HDF5 format variations (string, array, Uint8Array) into a plain string. */
export const normalizeExternalFileValue = (
  value: unknown,
): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.length > 0) {
    return normalizeExternalFileValue(value[0]);
  }
  if (value instanceof Uint8Array) {
    return new TextDecoder().decode(value);
  }
  if (ArrayBuffer.isView(value)) {
    return normalizeExternalFileValue(
      Array.from(value as unknown as ArrayLike<unknown>),
    );
  }
  return undefined;
};

export const getDandiApiBaseUrl = (nwbUrl: string) => {
  if (nwbUrl.startsWith("https://api.sandbox.dandiarchive.org/")) {
    return "https://api.sandbox.dandiarchive.org";
  }
  if (nwbUrl.startsWith("https://api-dandi.emberarchive.org/")) {
    return "https://api-dandi.emberarchive.org";
  }
  return "https://api.dandiarchive.org";
};

const getAssetIdFromNwbUrl = (nwbUrl: string) => {
  const match = nwbUrl.match(/\/assets\/([^/]+)\//);
  return match?.[1];
};

const dirnamePosix = (path: string) => {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
};

const joinPosix = (a: string, b: string) => {
  if (!a) return b;
  return `${a.replace(/\/+$/, "")}/${b.replace(/^\/+/, "")}`;
};

const getNwbAssetPath = async (nwbUrl: string) => {
  if (assetPathCache.has(nwbUrl)) {
    return assetPathCache.get(nwbUrl)!;
  }
  const promise = (async () => {
    const assetId = getAssetIdFromNwbUrl(nwbUrl);
    if (!assetId) {
      throw new Error(
        "Unable to determine the NWB asset ID from the current URL.",
      );
    }

    const apiBaseUrl = getDandiApiBaseUrl(nwbUrl);
    const metadataUrl = `${apiBaseUrl}/api/assets/${assetId}/`;
    const authHeader = getAuthorizationHeaderForUrl(metadataUrl);
    const headers = authHeader ? { Authorization: authHeader } : undefined;

    const assetMetadataResponse = await fetch(metadataUrl, { headers });
    if (!assetMetadataResponse.ok) {
      throw new Error("Failed to load NWB asset metadata from DANDI.");
    }
    const assetMetadata = await assetMetadataResponse.json();
    const assetPath = assetMetadata.path;
    if (!assetPath) {
      throw new Error("DANDI asset metadata did not include a path.");
    }
    return assetPath as string;
  })();
  assetPathCache.set(nwbUrl, promise);
  return promise;
};

/**
 * Resolves the playable video URL from an external_file value.
 *
 * If the external_file value is an absolute URL, it is returned directly.
 * If it is a relative path (e.g. "../video.avi"), the function resolves it
 * through the DANDI API: looks up the NWB asset's path within the dandiset,
 * combines it with the relative video path, searches for the video asset,
 * and returns the DANDI download URL.
 */
export const resolveExternalVideoFromFile = async (
  nwbUrl: string,
  externalFile: string,
  dandisetId: string | null,
  dandisetVersion: string,
) => {
  if (
    externalFile.startsWith("https://") ||
    externalFile.startsWith("http://")
  ) {
    return externalFile;
  }

  if (!isDandiAssetUrl(nwbUrl)) {
    throw new Error(
      "Only absolute URLs and DANDI-hosted relative external_file paths are supported in this first version.",
    );
  }

  if (!dandisetId) {
    throw new Error(
      "A dandisetId is required to resolve a relative external_file path.",
    );
  }

  const cacheKey = [nwbUrl, externalFile, dandisetId, dandisetVersion].join(
    "||",
  );
  if (resolvedVideoUrlCache.has(cacheKey)) {
    return resolvedVideoUrlCache.get(cacheKey)!;
  }

  const promise = (async () => {
    const apiBaseUrl = getDandiApiBaseUrl(nwbUrl);
    const authHeader = getAuthorizationHeaderForUrl(
      `${apiBaseUrl}/api/dandisets/${dandisetId}`,
    );
    const headers = authHeader ? { Authorization: authHeader } : undefined;

    const assetPath = await getNwbAssetPath(nwbUrl);
    const cleanRelativePath = externalFile
      .replace(/\\/g, "/")
      .replace(/^[./]+/, "");
    const fullVideoAssetPath = joinPosix(
      dirnamePosix(assetPath),
      cleanRelativePath,
    );
    const searchUrl =
      `${apiBaseUrl}/api/dandisets/${dandisetId}/versions/${dandisetVersion}` +
      `/assets/?path=${encodeURIComponent(fullVideoAssetPath)}`;
    const searchResponse = await fetch(searchUrl, { headers });
    if (!searchResponse.ok) {
      throw new Error("Failed to resolve the external video asset on DANDI.");
    }
    const searchData = await searchResponse.json();
    const videoAssetId = searchData.results?.[0]?.asset_id;
    if (!videoAssetId) {
      throw new Error(
        `Could not find the external video asset at ${fullVideoAssetPath}.`,
      );
    }

    return `${apiBaseUrl}/api/assets/${videoAssetId}/download/`;
  })();

  resolvedVideoUrlCache.set(cacheKey, promise);
  return promise;
};

/** Convenience wrapper: reads external_file from a series, then resolves its URL. */
export const resolveExternalVideoUrl = async (
  nwbUrl: string,
  seriesPath: string,
  dandisetId: string | null,
  dandisetVersion: string,
) => {
  const externalFile = await getExternalFileForSeries(nwbUrl, seriesPath);
  return resolveExternalVideoFromFile(
    nwbUrl,
    externalFile,
    dandisetId,
    dandisetVersion,
  );
};

export const getExternalFileForSeries = async (
  nwbUrl: string,
  seriesPath: string,
) => {
  const externalFileValue = await getHdf5DatasetData(
    nwbUrl,
    `${seriesPath}/external_file`,
    {
      slice: [[0, 1]],
    },
  );
  const externalFile = normalizeExternalFileValue(externalFileValue)?.trim();
  if (!externalFile) {
    throw new Error("Could not read external_file from the NWB ImageSeries.");
  }
  return externalFile;
};

/** Reads the start and end session time for an ImageSeries from timestamps or starting_time + rate. */
export const getSeriesTimeRange = async (
  nwbUrl: string,
  path: string,
  group?: Hdf5Group,
) => {
  const grp = group || (await getHdf5Group(nwbUrl, path));
  if (!grp) {
    throw new Error(`Unable to load ImageSeries group at ${path}.`);
  }

  const timestampsDataset = grp.datasets.find((ds) => ds.name === "timestamps");
  if (timestampsDataset) {
    const n = timestampsDataset.shape?.[0] || 0;
    if (n > 0) {
      const first = await getHdf5DatasetData(nwbUrl, timestampsDataset.path, {
        slice: [[0, 1]],
      });
      const last = await getHdf5DatasetData(nwbUrl, timestampsDataset.path, {
        slice: [[n - 1, n]],
      });
      return {
        startTime: (first?.[0] as number) || 0,
        endTime: (last?.[0] as number) || 0,
      };
    }
  }

  const startingTimeDataset = grp.datasets.find(
    (ds) => ds.name === "starting_time",
  );
  if (startingTimeDataset) {
    const value = await getHdf5DatasetData(
      nwbUrl,
      startingTimeDataset.path,
      {},
    );
    const startTime = Number(value);
    const rate = Number(startingTimeDataset.attrs?.rate || 0);
    const dataDataset = grp.datasets.find((ds) => ds.name === "data");
    if (rate > 0 && dataDataset && dataDataset.shape.length > 0) {
      return {
        startTime,
        endTime: startTime + (dataDataset.shape[0] - 1) / rate,
      };
    }
    return { startTime, endTime: startTime };
  }

  return { startTime: 0, endTime: 0 };
};
