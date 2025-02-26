import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ImageSeriesMp4View from "./ImageSeriesMp4View";

export const imageSeriesMp4Plugin: NwbObjectViewPlugin = {
  name: "ImageSeriesMp4",
  label: "MP4 Video",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
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

    // Check if we have either timestamps or starting_time
    const hasTimestamps = group.datasets.some((ds) => ds.name === "timestamps");
    const hasStartTime = group.datasets.some(
      (ds) => ds.name === "starting_time",
    );

    return hasData && (hasTimestamps || hasStartTime);
  },
  component: ImageSeriesMp4View,
  requiresWindowDimensions: true,
  showInMultiView: false,
  launchableFromTable: true,
};

export default imageSeriesMp4Plugin;
