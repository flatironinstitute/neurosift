import { getHdf5Dataset, getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ImagePluginView from "./ImagePluginView";

export const imagePlugin: NwbObjectViewPlugin = {
  name: "Image",
  canHandle: async ({
    nwbUrl,
    path,
    objectType,
  }: {
    nwbUrl: string;
    path: string;
    objectType: "group" | "dataset";
  }) => {
    if (objectType === "dataset") {
      const ds = await getHdf5Dataset(nwbUrl, path);
      if (ds?.attrs.neurodata_type === "Image") return true;
    } else {
      // objectType === "group"
      const grp = await getHdf5Group(nwbUrl, path);
      if (grp?.attrs.neurodata_type === "Images") return true;
    }
    return false;
  },
  component: ImagePluginView,
  launchableFromTable: false,
  requiresWindowDimensions: true,
  showInMultiView: true,
};

/*
Examples:

Image:
http://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/f02db27e-82eb-41dd-865a-a08bb41491da/download/&dandisetId=000728&dandisetVersion=0.240827.1809&tab=/processing/ophys/SummaryImages/maximum_intensity_projection

Images:
https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/65a7e913-45c7-48db-bf19-b9f5e910110a/download/&dandisetId=000673&dandisetVersion=0.250122.0110&tab=/stimulus/presentation/StimulusPresentation/indexed_images

*/

export default imagePlugin;
