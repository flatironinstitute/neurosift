import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import VAMEView from "./VAMEView";

export const vamePlugin: NwbObjectViewPlugin = {
  name: "VAME",
  label: "VAME ethogram",
  // Activates on an ndx-vame VAMEProject group that contains a MotifSeries.
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (group.attrs?.neurodata_type !== "VAMEProject") return false;
    return group.subgroups.some(
      (sg) => sg.attrs?.neurodata_type === "MotifSeries",
    );
  },
  component: VAMEView,
  requiresWindowDimensions: true,
  showInMultiView: false,
  launchableFromTable: true,
};

export default vamePlugin;
