import { RemoteH5File } from "@remote-h5-file/index";
import { neurodataTypeInheritsFrom } from "app/pages/NwbPage/neurodataSpec";
import {
  loadSpecifications,
  NwbFileSpecifications,
} from "app/pages/NwbPage/SpecificationsView/SetupNwbFileSpecificationsProvider";
import { ToolItem } from "../ChatWindow";

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
        },
      },
    },
  },
  detailedDescription,
  function: async (
    args: { nwb_file_url: string },
    onLogMessage: (title: string, message: string) => void,
  ) => {
    const { nwb_file_url } = args;
    onLogMessage("timeseries_alignment_view query", nwb_file_url);
    const data = await getTimeseriesAlignmentViewData(nwb_file_url);
    const numItems = data.items.length;
    const height = determineHeightFromNumItems(numItems);
    onLogMessage("timeseries_alignment_view response", JSON.stringify(data));
    return `https://figurl.org/f?v=https://tempory.net/ns-figurl-views/timeseries-alignment-view&d=${JSON.stringify(data)}&height=${height}`;
  },
};

const determineHeightFromNumItems = (numItems: number) => {
  return Math.min(Math.max(200, 70 * numItems), 600);
};

const getTimeseriesAlignmentViewData = async (nwb_file_url: string) => {
  const nwbFile = new RemoteH5File(nwb_file_url, {});
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
