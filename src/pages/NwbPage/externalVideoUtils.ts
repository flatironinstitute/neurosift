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

/**
 * Resolves a DANDI `/download/` URL to its presigned S3 URL by following the 302
 * redirect with the auth header. A plain `<video>` element cannot send custom
 * headers, so for embargoed dandisets the unauthenticated `/download/` request
 * returns 401 and never reaches S3. Resolving the presigned URL here (with the
 * same key used to load the NWB) lets the browser play embargoed assets.
 *
 * DANDI's S3 CORS blocks HEAD, so we use an aborted GET (see headRequest in
 * hdf5Interface.ts). Unlike getRedirectUrl, this surfaces a non-2xx response as a
 * clear error instead of silently returning the un-redirected `/download/` URL.
 */
const resolveDandiDownloadRedirect = async (
  downloadUrl: string,
  headers: { Authorization: string } | undefined,
): Promise<string> => {
  const controller = new AbortController();
  const response = await fetch(downloadUrl, {
    headers,
    signal: controller.signal,
  });
  controller.abort(); // status/url already settled; we only wanted the redirect target
  if (!response.ok) {
    throw new Error(
      `Could not access the external video on DANDI (status ${response.status}). ` +
        `If this is an embargoed dandiset, set your DANDI API key in Settings.`,
    );
  }
  return response.url; // presigned S3 URL after the followed 302
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

  // Local files served by `neurosift view-nwb`: the CLI symlinks the referenced
  // video into the same directory it serves, by basename, so resolve external_file
  // to its basename as a sibling of the NWB URL. This handles any stored path
  // shape (relative, "../", absolute POSIX, or Windows) uniformly. Scoped to
  // localhost (the view-nwb case we control), matching RemoteH5File.dataIsRemote.
  if (nwbUrl.startsWith("http://localhost")) {
    const base =
      externalFile.replace(/\\/g, "/").split("/").pop() || externalFile;
    return new URL(base, nwbUrl).href;
  }

  if (!isDandiAssetUrl(nwbUrl)) {
    return new URL(externalFile.replace(/\\/g, "/"), nwbUrl).href;
  }

  if (!dandisetId) {
    throw new Error(
      "A dandisetId is required to resolve a relative external_file path.",
    );
  }

  const apiBaseUrl = getDandiApiBaseUrl(nwbUrl);
  const authHeader = getAuthorizationHeaderForUrl(
    `${apiBaseUrl}/api/dandisets/${dandisetId}`,
  );
  const headers = authHeader ? { Authorization: authHeader } : undefined;

  // The cache stores the stable `/download/` URL (the expensive asset-path lookup +
  // asset search). The presigned S3 URL is resolved fresh on every call below, since
  // presigned URLs expire and must never be cached and served stale.
  const cacheKey = [nwbUrl, externalFile, dandisetId, dandisetVersion].join(
    "||",
  );
  let downloadPromise = resolvedVideoUrlCache.get(cacheKey);
  if (!downloadPromise) {
    downloadPromise = (async () => {
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
    resolvedVideoUrlCache.set(cacheKey, downloadPromise);
  }

  const downloadUrl = await downloadPromise;
  return resolveDandiDownloadRedirect(downloadUrl, headers);
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

/**
 * Classifies a `<video>` load failure: probes the URL to tell a network/access
 * failure (e.g. an expired presigned URL, an auth failure, or a transient 5xx)
 * apart from a genuine decode error, so the UI can show the right message instead
 * of always blaming the codec/container.
 */
export const describeVideoPlaybackError = async (
  videoUrl: string,
): Promise<string> => {
  try {
    const controller = new AbortController();
    const response = await fetch(videoUrl, { signal: controller.signal });
    controller.abort();
    if (!response.ok) {
      return (
        `This video could not be retrieved (HTTP ${response.status}). ` +
        `The link may have expired or the asset may require a DANDI API key set in Settings.`
      );
    }
  } catch {
    return "This video could not be retrieved due to a network or access error.";
  }
  return (
    "This video could not be played because its container or codec is not " +
    "supported by the browser. Most likely, the uploaded video uses a format " +
    "like AVI with a non-browser-friendly codec."
  );
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

// Roots under which external-file videos are discovered.
export const VIDEO_DISCOVERY_ROOTS = [
  "/acquisition",
  "/processing",
  "/analysis",
  "/stimulus",
  "/intervals",
];

/**
 * Returns true as soon as one external-file ImageSeries is found anywhere under
 * the discovery roots. Used to decide whether to show the Videos tab at all, so
 * a file with no external videos does not get a dead button.
 */
export const hasExternalVideos = async (nwbUrl: string): Promise<boolean> => {
  const visit = async (path: string): Promise<boolean> => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      group.attrs?.neurodata_type === "ImageSeries" &&
      group.datasets.some((ds) => ds.name === "external_file")
    ) {
      return true;
    }
    for (const subgroup of group.subgroups || []) {
      if (await visit(subgroup.path)) return true;
    }
    return false;
  };
  for (const root of VIDEO_DISCOVERY_ROOTS) {
    if (await visit(root)) return true;
  }
  return false;
};
