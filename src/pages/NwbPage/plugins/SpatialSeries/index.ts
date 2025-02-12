import { getNwbGroup } from "@nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import SpatialSeriesPluginView from "./SpatialSeriesPluginView";

export const spatialSeriesPlugin: NwbObjectViewPlugin = {
  name: "SpatialSeriesXY",
  label: "XY",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;

    // Check if this is a SpatialSeries neurodata_type
    if (group.attrs.neurodata_type !== "SpatialSeries") return false;

    // Check if we have a data dataset
    const hasData = group.datasets.some((ds) => ds.name === "data");
    if (!hasData) return false;

    // Verify the data dimensions (should be 2D array with 2 channels)
    const dataDataset = group.datasets.find((ds) => ds.name === "data");
    if (!dataDataset) return false;

    // Check for 2D array with second dimension of size 2 (x,y coordinates)
    if (dataDataset.shape.length !== 2) return false;
    const numChannels = dataDataset.shape[1];
    if (numChannels !== 2) return false;

    // Check if we have either timestamps or start_time
    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
    const hasStartTime = group.datasets.some(
      (ds) => ds.name === "starting_time",
    );

    return hasData && (hasTimestamps || hasStartTime);
  },
  component: SpatialSeriesPluginView,
  // We need window dimensions since we're displaying a spatial plot
  requiresWindowDimensions: true,
  showInMultiView: false,
  special: true,
};
