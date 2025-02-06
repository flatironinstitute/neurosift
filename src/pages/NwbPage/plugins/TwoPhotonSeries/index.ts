import { getNwbGroup } from "../../nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import TwoPhotonSeriesPluginView from "./TwoPhotonSeriesPluginView";

export const twoPhotonSeriesPlugin: NwbObjectViewPlugin = {
  name: "TwoPhotonSeries",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;

    // Check if this is a TwoPhotonSeries or OnePhotonSeries neurodata_type
    if (
      group.attrs.neurodata_type !== "TwoPhotonSeries" &&
      group.attrs.neurodata_type !== "OnePhotonSeries"
    ) {
      return false;
    }

    // Check if we have a data dataset
    const hasData = group.datasets.some((ds) => ds.name === "data");
    if (!hasData) return false;

    // Verify the data dimensions (should be 3D or 4D array)
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) return false;

    // Check for 3D or 4D array (frames x height x width [x planes])
    if (dataDataset.shape.length !== 3 && dataDataset.shape.length !== 4)
      return false;

    // Check if we have either timestamps or starting_time
    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
    const hasStartTime = group.datasets.some(
      (ds) => ds.name === "starting_time",
    );

    return hasData && (hasTimestamps || hasStartTime);
  },
  component: TwoPhotonSeriesPluginView,
  requiresWindowDimensions: true,
};
