import { getRemoteH5FileLindi } from "./remote-h5-file";

interface NwbNeurodataObject {
  path: string;
  neurodata_type: string;
  shape?: number[];
}

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  if (url.endsWith(".lindi.json") || url.endsWith(".lindi.tar")) {
    return url;
  }
  let assetId: string;
  let staging: boolean;
  if (url.startsWith("https://api-staging.dandiarchive.org/api/assets/")) {
    staging = true;
    assetId = url.split("/")[5];
  } else if (
    url.startsWith("https://api-staging.dandiarchive.org/api/dandisets/")
  ) {
    staging = true;
    dandisetId = url.split("/")[5];
    const indexOfAssetsPart = url.split("/").indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = url.split("/")[indexOfAssetsPart + 1];
  } else if (url.startsWith("https://api.dandiarchive.org/api/assets/")) {
    staging = false;
    assetId = url.split("/")[5];
  } else if (url.startsWith("https://api.dandiarchive.org/api/dandisets/")) {
    // https://api.dandiarchive.org/api/dandisets/000246/versions/draft/assets/24190f91-44ae-4e77-8581-19dcc567a161/download/
    staging = false;
    dandisetId = url.split("/")[5];
    const indexOfAssetsPart = url.split("/").indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = url.split("/")[indexOfAssetsPart + 1];
  } else {
    return undefined;
  }
  if (!dandisetId) return undefined;
  if (!assetId) return undefined;
  const aa = staging ? "dandi-staging" : "dandi";
  const tryUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dandisetId}/assets/${assetId}/nwb.lindi.json`;
  const resp = await fetch(tryUrl, { method: "HEAD" });
  if (resp.ok) return tryUrl;
  return undefined;
};

export async function getNwbFileNeurodataObjects(
  dandisetId: string,
  nwbFileUrl: string
): Promise<NwbNeurodataObject[]> {
  const lindiUrl = await tryGetLindiUrl(nwbFileUrl, dandisetId);
  if (!lindiUrl) {
    throw new Error("Failed to get lindiUrl");
  }
  const f = await getRemoteH5FileLindi(lindiUrl);
  const ret: NwbNeurodataObject[] = [];
  const processGroup = async (path: string) => {
    const grp = await f.getGroup(path);
    if (!grp) return;
    if (grp.attrs.neurodata_type) {
      ret.push({
        path,
        neurodata_type: grp.attrs.neurodata_type
      });
    }
    for (const ds of grp.datasets) {
      if (ds.attrs?.neurodata_type) {
        ret.push({
          path: ds.path,
          neurodata_type: ds.attrs.neurodata_type,
          shape: ds.shape
        });
      }
    }
    for (const subgrp of grp.subgroups) {
      await processGroup(subgrp.path);
    }
  }
  await processGroup('/');
  return ret;
}
