import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ExternalFileVideoView from "./ExternalFileVideoView";

export const externalFileVideoPlugin: NwbObjectViewPlugin = {
  name: "ExternalFileVideo",
  label: "Video",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    const supportedTypes = [
      "ImageSeries",
      "OnePhotonSeries",
      "TwoPhotonSeries",
    ];
    if (!supportedTypes.includes(group.attrs.neurodata_type)) {
      return false;
    }

    return group.datasets.some((ds) => ds.name === "external_file");
  },
  component: ExternalFileVideoView,
  requiresWindowDimensions: true,
  showInMultiView: false,
  launchableFromTable: true,
};

export default externalFileVideoPlugin;
