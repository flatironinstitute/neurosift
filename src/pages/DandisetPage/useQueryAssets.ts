/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  AssetsResponse,
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

export const useQueryAssets = (
  dandisetId: string | undefined,
  maxNumPages: number,
  dandisetResponse: DandisetSearchResultItem | null,
  dandisetVersionInfo: DandisetVersionInfo | null,
  useStaging: boolean | undefined,
  nwbFilesOnly: boolean = false,
): {
  incomplete: boolean;
  assetsResponses: AssetsResponse[] | null;
} => {
  const [assetsResponses, setAssetsResponses] = useState<
    AssetsResponse[] | null
  >(null);
  const [incomplete, setIncomplete] = useState(false);
  useEffect(() => {
    let canceled = false;
    setAssetsResponses(null);
    setIncomplete(false);
    if (!dandisetId) return;
    if (!dandisetResponse) return;
    if (!dandisetVersionInfo) return;
    (async () => {
      let rr: AssetsResponse[] = [];
      const stagingStr = useStaging ? "-staging" : "";
      const globFilter = nwbFilesOnly ? "&glob=*.nwb*" : "";
      let uu: string | null =
        `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersionInfo.version}/assets/?page_size=1000${globFilter}`;
      const authorizationHeader = uu ? getAuthorizationHeaderForUrl(uu) : "";
      const headers = authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined;
      let count = 0;
      while (uu) {
        if (count >= maxNumPages) {
          setIncomplete(true);
          break;
        }
        const rrr = await fetch(
          // don't know why typescript is telling me I need any type here
          uu,
          { headers },
        );
        if (canceled) return;
        if (rrr.status === 200) {
          const json: any = await rrr.json();
          rr = [...rr, json]; // important to make a copy of rr
          uu = json.next;
        } else uu = null;
        count += 1;
        setAssetsResponses(rr);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [
    dandisetId,
    dandisetResponse,
    useStaging,
    maxNumPages,
    dandisetVersionInfo,
    setIncomplete,
    nwbFilesOnly,
  ]);
  return { incomplete, assetsResponses };
};

export default useQueryAssets;
