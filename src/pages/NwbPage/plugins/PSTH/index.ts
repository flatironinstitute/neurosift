import { getNwbGroup } from "@nwbInterface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import PSTHView from "./PSTHView";

export const psthPlugin: NwbObjectViewPlugin = {
  name: "PSTH",
  canHandle: async ({
    nwbUrl,
    path,
    secondaryPaths,
  }: {
    nwbUrl: string;
    path: string;
    secondaryPaths?: string[];
  }) => {
    if (!secondaryPaths) return false;
    if (secondaryPaths.length !== 1) return false;
    const group = await getNwbGroup(nwbUrl, path);
    if (!group) return false;
    if (group.attrs["neurodata_type"] !== "TimeIntervals") return false;
    const unitsPath = secondaryPaths[0];
    const unitsGroup = await getNwbGroup(nwbUrl, unitsPath);
    if (!unitsGroup) return false;
    if (unitsGroup.attrs["neurodata_type"] !== "Units") return false;
    return true;
  },
  component: PSTHView,
  special: true,
  requiresWindowDimensions: true,
};
