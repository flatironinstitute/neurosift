import { DandisetVersionInfo } from "../../DandiPage/dandi-types";
import { useLazyDandisetPaths as useDandiPaths } from "../../DandisetPage/hooks/useLazyDandisetPaths";

const EMBER_API = "https://api-dandi.emberarchive.org/api";

/** EMBER runs the DANDI archive, so its folders list the same way. */
export const useLazyDandisetPaths = (
  dandisetId: string | undefined,
  dandisetVersionInfo: DandisetVersionInfo | null,
  staging: boolean,
  nwbFilesOnly: boolean = false,
) =>
  useDandiPaths(
    dandisetId,
    dandisetVersionInfo,
    staging,
    nwbFilesOnly,
    EMBER_API,
  );

export default useLazyDandisetPaths;
