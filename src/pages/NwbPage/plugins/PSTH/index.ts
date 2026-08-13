import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import { neurodataTypeInheritsFrom } from "../../neurodataTypeInheritance";
import PSTHView from "./PSTHView";

export const psthPlugin: NwbObjectViewPlugin = {
  name: "PSTH",
  canHandle: async ({ nwbUrl, path, secondaryPaths, specifications }) => {
    if (!secondaryPaths) return false;
    if (secondaryPaths.length !== 1) return false;
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;
    if (
      !neurodataTypeInheritsFrom(
        group.attrs["neurodata_type"],
        "TimeIntervals",
        specifications,
      )
    )
      return false;
    const unitsPath = secondaryPaths[0];
    const unitsGroup = await getHdf5Group(nwbUrl, unitsPath);
    if (!unitsGroup) return false;
    if (
      !neurodataTypeInheritsFrom(
        unitsGroup.attrs["neurodata_type"],
        "Units",
        specifications,
      )
    )
      return false;
    return true;
  },
  component: PSTHView,
  launchableFromTable: true,
  requiresWindowDimensions: true,
  requiredDefaultUnits: true,
};
