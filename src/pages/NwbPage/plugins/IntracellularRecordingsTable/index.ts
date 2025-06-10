import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import IntracellularRecordingsTableView from "./IntracellularRecordingsTableView";

export const intracellularRecordingsTablePlugin: NwbObjectViewPlugin = {
  name: "Icephys",
  canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check if this is an IntracellularRecordingsTable neurodata_type
    if (group.attrs.neurodata_type !== "IntracellularRecordingsTable") {
      return false;
    }

    return true;
  },
  component: IntracellularRecordingsTableView,
  showInMultiView: true,
  launchableFromTable: true,
};
