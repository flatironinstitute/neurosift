import { getHdf5Dataset, getHdf5Group } from "@hdf5Interface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ImagePluginView from "./ImagePluginView";

export const imagePlugin: NwbObjectViewPlugin = {
  name: "Image",
  canHandle: async ({ nwbUrl, path, objectType, specifications }) => {
    if (objectType === "dataset") {
      const ds = await getHdf5Dataset(nwbUrl, path);
      if (
        neurodataTypeInheritsFrom(
          ds?.attrs.neurodata_type,
          "Image",
          specifications,
        )
      )
        return true;
    } else {
      // objectType === "group"
      const grp = await getHdf5Group(nwbUrl, path);
      if (
        neurodataTypeInheritsFrom(
          grp?.attrs.neurodata_type,
          "Images",
          specifications,
        )
      )
        return true;
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

GrayscaleImage:
https://neurosift.app/nwb?url=https://api.dandiarchive.org/api/assets/ba9fa55d-6b94-46cf-b72f-6135e92e8f45/download/&dandisetId=001780&dandisetVersion=draft&tab=/processing/plane-1/images/correlation_projection_denoised_plane-1

*/

export default imagePlugin;
