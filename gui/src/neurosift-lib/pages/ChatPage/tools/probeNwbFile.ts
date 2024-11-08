import {
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "../../../remote-h5-file/index";
import getNwbFileInfoForChat from "./getNwbFileInfoForChat";
import { ToolItem } from "../ToolItem";

const detailedDescription = `
This tool uses the NWB file URL to get detailed information about the file.
If the Dandiset ID is known, it should be provided to help with the information retrieval.
This function returns a JSON object with important metadata about the NWB file as well as detailed information about the neurodata items in the file.
`;

export const probeNwbFileTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "probe_nwb_file",
      description:
        "Use this tool to get detailed information about an NWB file.",
      parameters: {
        type: "object",
        properties: {
          nwb_file_url: {
            type: "string",
            description: "The URL of the NWB file to get information about",
          },
          dandiset_id: {
            type: "string",
            description: "The Dandiset ID of the NWB file, if known.",
          },
        },
      },
    },
  },
  detailedDescription,
  function: async (
    args: any,
    onLogMessage: (title: string, message: string) => void,
    o: {
      modelName: string;
      openRouterKey: string | null;
    },
  ) => {
    const urlLindi = await tryGetLindiUrl(args.nwb_file_url, args.dandiset_id);
    let nwbFile: RemoteH5FileX;
    if (urlLindi) {
      nwbFile = await RemoteH5FileLindi.create(urlLindi);
    } else {
      nwbFile = new RemoteH5File(args.url, {});
    }
    const info = await getNwbFileInfoForChat(nwbFile);
    return info;
  },
};

const tryGetLindiUrl = async (url: string, dandisetId: string) => {
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
