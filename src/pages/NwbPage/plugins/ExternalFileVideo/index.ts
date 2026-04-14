import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ExternalFileVideoView from "./ExternalFileVideoView";

export const externalFileVideoPlugin: NwbObjectViewPlugin = {
  // Internal identifier used by the plugin system
  name: "ExternalFileVideo",
  // Text shown on the button in the hierarchy table
  label: "Video",
  // Determines whether this plugin can render a given NWB object.
  // Called by findSuitablePlugins() for every object in the hierarchy.
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    if (group.attrs.neurodata_type !== "ImageSeries") {
      return false;
    }

    // Only activate when the data is in an external file, not stored inline
    return group.datasets.some((ds) => ds.name === "external_file");
  },
  // The React component rendered when this plugin is activated
  component: ExternalFileVideoView,
  // Pass width/height props so the video player can size itself
  requiresWindowDimensions: true,
  // Don't include in multi-object stacked views
  showInMultiView: false,
  // Show a labeled button in the hierarchy table (not just the generic open icon)
  launchableFromTable: true,
};

export default externalFileVideoPlugin;
