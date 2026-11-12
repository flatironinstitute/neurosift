import { useEffect, useState } from "react";
import { DandisetSearchResultItem } from "../EmberPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

export const useQueryEmberDandiset = (
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
      // TODO: use standbox at all?
      // const stagingStr = useStaging ? "-staging" : "";
      const url = `https://api-dandi.emberarchive.org/api/dandisets/${dandisetId}`;
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
            `Error fetching EMBER Dandiset due to permissions. If this EMBER Dandiset is embargoed, ` +
              "make sure to set your EMBER API KEY on the settings page.",
            response,
          );
        } else {
          console.error("Error fetching EMBER Dandiset", response);
        }
        setDandisetResponse(null);
      } catch (e) {
        console.error("Error fetching EMBER Dandiset", e);
        setDandisetResponse(null);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId, useStaging]);
  return dandisetResponse;
};

export default useQueryEmberDandiset;
