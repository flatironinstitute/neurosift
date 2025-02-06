import { useEffect, useState } from "react";
import {
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

export const useDandisetVersionInfo = (
  dandisetId: string | undefined,
  dandisetVersion: string,
  useStaging: boolean | undefined,
  dandisetResponse: DandisetSearchResultItem | null,
) => {
  const [dandisetVersionInfo, setDandisetVersionInfo] =
    useState<DandisetVersionInfo | null>(null);
  useEffect(() => {
    let canceled = false;
    setDandisetVersionInfo(null);
    if (!dandisetResponse) return;
    (async () => {
      const { most_recent_published_version, draft_version } =
        dandisetResponse || {};
      const V = most_recent_published_version || draft_version;
      const dsVersion = dandisetVersion || (V ? V.version : "draft");
      const dvi = await fetchDandisetVersionInfo(
        dandisetId || "",
        dsVersion,
        useStaging,
      );
      if (canceled) return;
      if (dvi) setDandisetVersionInfo(dvi);
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId, dandisetResponse, dandisetVersion, useStaging]);
  return dandisetVersionInfo;
};

export const fetchDandisetVersionInfo = async (
  dandisetId: string,
  dandisetVersion: string,
  useStaging: boolean | undefined,
) => {
  const stagingStr = useStaging ? "-staging" : "";
  const url = `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandisetId}/versions/${
    dandisetVersion || "draft"
  }/info/`;
  const authorizationHeader = getAuthorizationHeaderForUrl(url);
  const headers = authorizationHeader
    ? { Authorization: authorizationHeader }
    : undefined;
  const response = await fetch(url, { headers });
  if (response.status === 200) {
    const json = await response.json();
    return json as DandisetVersionInfo;
  }
  return null;
};
