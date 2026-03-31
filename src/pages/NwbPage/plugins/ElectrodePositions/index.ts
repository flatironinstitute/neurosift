import { getHdf5Group } from "@hdf5Interface";
import { NwbObjectViewPlugin } from "../pluginInterface";
import ElectrodePositionsView from "./ElectrodePositionsView";

/**
 * Resolve the space linked from an AnatomicalCoordinatesTable.
 * The table has a "space" subgroup which is a soft link (_SOFT_LINK)
 * to a Space or AllenCCFv3Space group.
 */
async function resolveSpaceName(
  nwbUrl: string,
  tablePath: string,
): Promise<string | undefined> {
  // The "space" subgroup may be a soft link
  const spaceGroup = await getHdf5Group(nwbUrl, `${tablePath}/space`);
  if (!spaceGroup) return undefined;

  // If it's a soft link, attrs will have _SOFT_LINK with path
  const softLink = spaceGroup.attrs._SOFT_LINK as
    | { path: string }
    | undefined;
  if (softLink?.path) {
    const targetGroup = await getHdf5Group(nwbUrl, softLink.path);
    if (targetGroup) {
      return targetGroup.attrs.space_name as string | undefined;
    }
  }

  // If the link was resolved directly, space_name may already be here
  return spaceGroup.attrs.space_name as string | undefined;
}

export const electrodePositionsPlugin: NwbObjectViewPlugin = {
  name: "ElectrodePositions",
  label: "Electrode Positions (Allen CCF)",
  canHandle: async ({
    nwbUrl,
    path,
  }: {
    nwbUrl: string;
    path: string;
  }) => {
    const group = await getHdf5Group(nwbUrl, path);
    if (!group) return false;

    // Check for AnatomicalCoordinatesTable with x, y, z columns
    if (group.attrs.neurodata_type === "AnatomicalCoordinatesTable") {
      const colnames = group.attrs.colnames;
      if (!Array.isArray(colnames)) return false;
      if (
        !colnames.includes("x") ||
        !colnames.includes("y") ||
        !colnames.includes("z")
      )
        return false;

      // Check that the space is AllenCCFv3
      const spaceName = await resolveSpaceName(nwbUrl, path);
      return spaceName === "AllenCCFv3";
    }

    return false;
  },
  component: ElectrodePositionsView,
  requiresWindowDimensions: true,
  showInMultiView: true,
};
