/* eslint-disable @typescript-eslint/no-explicit-any */
import createUsageScriptForNwbFile from "./createUsageScriptForNwbFile";

interface NwbFileInfo {
  usageString: string;
}

export const tryGetLindiUrl = async (url: string, dandisetId: string) => {
  if (url.endsWith(".lindi.json") || url.endsWith(".lindi.tar")) {
    return url;
  }

  const parts = url.split("/");
  let assetId: string | undefined;
  let staging: boolean;
  let dId = dandisetId;

  if (url.startsWith("https://api-staging.dandiarchive.org/api/assets/")) {
    staging = true;
    assetId = parts[5];
  } else if (url.startsWith("https://api-staging.dandiarchive.org/api/dandisets/")) {
    staging = true;
    dId = parts[5];
    const indexOfAssetsPart = parts.indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = parts[indexOfAssetsPart + 1];
  } else if (url.startsWith("https://api.dandiarchive.org/api/assets/")) {
    staging = false;
    assetId = parts[5];
  } else if (url.startsWith("https://api.dandiarchive.org/api/dandisets/")) {
    staging = false;
    dId = parts[5];
    const indexOfAssetsPart = parts.indexOf("assets");
    if (indexOfAssetsPart === -1) return undefined;
    assetId = parts[indexOfAssetsPart + 1];
  } else {
    return undefined;
  }

  if (!dId || !assetId) return undefined;

  const aa = staging ? "dandi-staging" : "dandi";
  const tryUrl = `https://lindi.neurosift.org/${aa}/dandisets/${dId}/assets/${assetId}/nwb.lindi.json`;
  const resp = await fetch(tryUrl, { method: "HEAD" });
  return resp.ok ? tryUrl : undefined;
};

export async function getNwbFileInfo(
  dandisetId: string,
  nwbFileUrl: string
): Promise<NwbFileInfo> {
  const lindiUrl = await tryGetLindiUrl(nwbFileUrl, dandisetId);
  if (!lindiUrl) {
    throw new Error("Failed to get lindiUrl");
  }

  let usageString = await createUsageScriptForNwbFile(lindiUrl);
  if (!usageString) {
    throw new Error("Failed to get usageString");
  }

  const contentHeader = `# This is how you would access data in this particular NWB file using lindi and pynwb.

# Lindi and pynwb are Python libraries that can be installed using pip:
# pip install lindi pynwb


import pynwb
import lindi

# Load ${nwbFileUrl}
${
  lindiUrl
    ? `f = lindi.LindiH5pyFile.from_lindi_file("${lindiUrl}")`
    : `f = lindi.LindiH5pyFile.from_hdf5_file("${nwbFileUrl}")`
}
nwb = pynwb.NWBHDF5IO(file=f, mode='r').read()

`
  usageString = contentHeader + usageString;

  return {
    usageString
  };
}
