import { useEffect, useState } from "react";
import { DandisetSearchResultItem } from "../DandiPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

export const useQueryDandiset = (
  dandisetId: string | undefined,
  useStaging: boolean | undefined,
) => {
  const [dandisetResponse, setDandisetResponse] = useState<
    DandisetSearchResultItem | undefined | null
  >(null);
  useEffect(() => {
    let canceled = false;
    setDandisetResponse(undefined);
    if (!dandisetId) return;
    (async () => {
      const stagingStr = useStaging ? "-staging" : "";
      const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandisetId}`;
      const authorizationHeader = getAuthorizationHeaderForUrl(url);
      const headers = authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined;
      try {
        const response = await fetch(url, {
          headers,
        });
        if (canceled) return;
        if (response.status === 200) {
          const json = await response.json();
          const dandisetResponse = json as DandisetSearchResultItem;
          setDandisetResponse(dandisetResponse);
          return;
        } else if (response.status === 403) {
          console.error(
            `Error fetching dandiset due to permissions. If this dandiset is embargoed, ` +
              "make sure to set your DANDI API KEY on the settings page.",
            response,
          );
        } else {
          console.error("Error fetching dandiset", response);
        }
        setDandisetResponse(null);
      } catch (e) {
        console.error("Error fetching dandiset", e);
        setDandisetResponse(null);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId, useStaging]);
  return dandisetResponse;
};

export default useQueryDandiset;
