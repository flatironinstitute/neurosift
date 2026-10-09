/**
 * Where to read a Zarr asset on DANDI from.
 *
 * DANDI redirects the /download/ url of an HDF5 asset to the file, but a Zarr
 * asset is a folder of many files and its /download/ url answers 400. The
 * asset's metadata lists the folder's url in the bucket, which is what the
 * Zarr reader takes.
 */

/** Whether a path in a dandiset names an NWB file, as HDF5 or as Zarr. */
export const isNwbAssetPath = (path: string) =>
  path.endsWith(".nwb") || path.endsWith(".nwb.zarr");

const zarrStoreUrlPattern = /\/zarr\/[0-9a-f-]{36}\/?$/;

/**
 * The url of the Zarr store behind a DANDI asset /download/ url, or undefined
 * if the url is not one or the asset is not Zarr.
 */
export const getDandiZarrStoreUrl = async (
  downloadUrl: string,
  headers?: { [key: string]: string },
): Promise<string | undefined> => {
  const match = downloadUrl
    .split("?")[0]
    .match(/^(https:\/\/[^/]+\/api\/assets\/[0-9a-f-]{36})\/download\/?$/);
  if (!match) return undefined;
  try {
    const response = await fetch(`${match[1]}/info/`, { headers });
    if (!response.ok) return undefined;
    const info = await response.json();
    if (!info?.zarr) return undefined;
    const contentUrl: unknown = info.metadata?.contentUrl;
    if (!Array.isArray(contentUrl)) return undefined;
    return contentUrl.find(
      (url): url is string =>
        typeof url === "string" && zarrStoreUrlPattern.test(url),
    );
  } catch {
    return undefined;
  }
};
