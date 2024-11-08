import {
  RemoteH5File,
  RemoteH5FileLindi,
  RemoteH5FileX,
} from "../../../remote-h5-file/index";
import { neurodataTypeInheritsFrom } from "./neurodataSpec";
import {
  loadSpecifications,
  NwbFileSpecifications,
} from "../../../misc/SpecificationsView/SetupNwbFileSpecificationsProvider";
import { ToolItem } from "../ToolItem";

const detailedDescription = `
This function returns a URL for a timeseries alignment visualization for a given NWB file.

The visualization is a plot that shows the start and end times of all the timeseries objects in the NWB file.

IMPORTANT: When you get the URL, you should return it as is on a separate line of the response (don't put it in a markdown link), because then the chat interface will render it inline.
`;

export const timeseriesAlignmentViewTool: ToolItem = {
  tool: {
    type: "function" as any,
    function: {
      name: "timeseries_alignment_view",
      description:
        "Returns a URL for a timeseries alignment visualization for a given NWB file",
      parameters: {
        type: "object",
        properties: {
          nwb_file_url: {
            type: "string",
            description: "The URL of the NWB file to visualize",
          },
          dandiset_id: {
            type: "string",
            description:
              "The Dandiset ID where the NWB file is stored. If not known, leave empty.",
          },
        },
      },
    },
  },
  detailedDescription,
  function: async (
    args: { nwb_file_url: string; dandiset_id: string | undefined },
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const { nwb_file_url, dandiset_id } = args;
    onLogMessage(
      "timeseries_alignment_view query",
      nwb_file_url + " (" + dandiset_id + ")",
    );
    const data = await getTimeseriesAlignmentViewData(
      nwb_file_url,
      dandiset_id,
    );
    const numItems = data.items.length;
    const height = determineHeightFromNumItems(numItems);
    onLogMessage("timeseries_alignment_view response", JSON.stringify(data));
    const dStr = JSON.stringify(data).split(" ").join("%20");
    return `https://figurl.org/f?v=https://tempory.net/ns-figurl-views/timeseries-alignment-view&d=${dStr}&height=${height}`;
  },
};

const determineHeightFromNumItems = (numItems: number) => {
  return Math.min(Math.max(200, 70 * numItems), 600);
};

const getTimeseriesAlignmentViewData = async (
  nwb_file_url: string,
  dandiset_id: string | undefined,
) => {
  const urlLindi = await tryGetLindiUrl(nwb_file_url, dandiset_id || "");
  let nwbFile: RemoteH5FileX;
  if (urlLindi) {
    nwbFile = await RemoteH5FileLindi.create(urlLindi);
  } else {
    nwbFile = new RemoteH5File(nwb_file_url, {});
  }
  const items: {
    path: string;
    neurodataType: string;
    startTime: number;
    endTime: number;
    color: string;
  }[] = [];
  let specifications: NwbFileSpecifications | undefined;
  try {
    specifications = await loadSpecifications(nwbFile);
  } catch (err) {
    console.warn("Problem loading specifications");
    console.warn(err);
  }
  const handleGroup = async (path: string) => {
    const gr = await nwbFile.getGroup(path);
    if (!gr) return;
    const nt = gr.attrs["neurodata_type"];
    if (neurodataTypeInheritsFrom(nt, "TimeSeries", specifications)) {
      try {
        const timestampsSubdataset = gr.datasets.find(
          (ds) => ds.name === "timestamps",
        );
        const startingTimeSubdataset = gr.datasets.find(
          (ds) => ds.name === "starting_time",
        );
        const dataSubdataset = gr.datasets.find((ds) => ds.name === "data");
        if (timestampsSubdataset) {
          const v1 = await nwbFile.getDatasetData(timestampsSubdataset.path, {
            slice: [[0, 1]],
          });
          if (!v1) return;
          const N = timestampsSubdataset.shape[0];
          const v2 = await nwbFile.getDatasetData(timestampsSubdataset.path, {
            slice: [[N - 1, N]],
          });
          if (!v2) return;
          const startTime = v1[0];
          const endTime = v2[0];
          items.push({
            path: gr.path,
            neurodataType: nt,
            startTime,
            endTime,
            color: "black",
          });
        } else if (startingTimeSubdataset && dataSubdataset) {
          const v = await nwbFile.getDatasetData(
            startingTimeSubdataset.path,
            {},
          );
          const startTime = v as any as number;
          const rate = startingTimeSubdataset.attrs["rate"];
          const endTime = startTime + (dataSubdataset.shape[0] - 1) / rate;
          items.push({
            path: gr.path,
            neurodataType: nt,
            startTime,
            endTime,
            color: "green",
          });
        }
      } catch (err) {
        console.warn("Problem processing group", gr.path);
        console.warn(err);
      }
    } else {
      for (const sg of gr.subgroups) {
        await handleGroup(sg.path);
      }
    }
  };
  await handleGroup("/");
  return { items };
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
