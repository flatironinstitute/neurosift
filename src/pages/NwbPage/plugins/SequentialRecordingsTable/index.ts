import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import SequentialRecordingsTableView from "./SequentialRecordingsTableView";

export const sequentialRecordingsTablePlugin: NwbObjectViewPlugin = {
    name: "Sequential",
    canHandle: async ({ nwbUrl, path }: { nwbUrl: string; path: string }) => {
        const group = await getHdf5Group(nwbUrl, path);
        if (!group) return false;

        // Check if this is a SequentialRecordingsTable neurodata_type
        if (group.attrs.neurodata_type !== "SequentialRecordingsTable") {
            return false;
        }

        return true;
    },
    component: SequentialRecordingsTableView,
    showInMultiView: true,
    launchableFromTable: true,
};
