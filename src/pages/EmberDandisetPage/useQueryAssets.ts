/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  AssetsResponse,
  DandisetSearchResultItem,
  DandisetVersionInfo,
} from "../DandiPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

// Global cache for storing loaded pages
interface CachedPage {
  url: string;
  response: any;
  timestamp: number;
}

interface CacheKey {
  dandisetId: string;
  version: string;
  isStaging: boolean;
  nwbFilesOnly: boolean;
}

interface CacheValue {
  pages: CachedPage[];
  lastRequestedPages: number;
}

interface QueryAssetsReturn {
  incomplete: boolean;
  assetsResponses: AssetsResponse[] | null;
  totalCount: number | undefined;
}

const globalAssetsCache = new Map<string, CacheValue>();

const getCacheKey = (key: CacheKey): string => {
  return `${key.dandisetId}:${key.version}:${key.isStaging}:${key.nwbFilesOnly}`;
};

export const useQueryAssets = (
  dandisetId: string | undefined,
  numPages: number,
  dandisetResponse: DandisetSearchResultItem | null,
  dandisetVersionInfo: DandisetVersionInfo | null,
  useStaging: boolean | undefined,
  nwbFilesOnly: boolean = false,
): QueryAssetsReturn => {
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
      const cacheKey = getCacheKey({
        dandisetId,
        version: dandisetVersionInfo.version,
        isStaging: !!useStaging,
        nwbFilesOnly,
      });

      let rr: AssetsResponse[] = [];
      const stagingStr = useStaging ? "-staging" : "";
      const globFilter = nwbFilesOnly ? "&glob=*.nwb" : "";
      let uu: string | null =
        `https://api${stagingStr}.dandiarchive.org/api/dandisets/${dandisetId}/versions/${dandisetVersionInfo.version}/assets/?page_size=1000${globFilter}`;
      const authorizationHeader = uu ? getAuthorizationHeaderForUrl(uu) : "";
      const headers = authorizationHeader
        ? { Authorization: authorizationHeader }
        : undefined;

      // Initialize or update cache
      if (!globalAssetsCache.has(cacheKey)) {
        globalAssetsCache.set(cacheKey, {
          pages: [],
          lastRequestedPages: numPages,
        });
      }
      const cache = globalAssetsCache.get(cacheKey)!;
      cache.lastRequestedPages = numPages;

      let count = 0;
      while (uu) {
        if (count >= numPages) {
          setIncomplete(true);
          break;
        }

        // Check cache first
        const cachedPage = cache.pages.find((p) => p.url === uu);
        if (cachedPage) {
          rr = [...rr, cachedPage.response];
          uu = cachedPage.response.next;
          count += 1;
          setAssetsResponses(rr);
          continue;
        }

        const rrr = await fetch(
          // don't know why typescript is telling me I need any type here
          uu,
          { headers },
        );
        if (canceled) return;
        if (rrr.status === 200) {
          const json: any = await rrr.json();
          // Add to cache
          cache.pages.push({
            url: uu,
            response: json,
            timestamp: Date.now(),
          });
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
    numPages,
    dandisetVersionInfo,
    setIncomplete,
    nwbFilesOnly,
  ]);

  // Get total count from first page response if available
  const totalCount = assetsResponses?.[0]?.count;
  return { incomplete, assetsResponses, totalCount };
};

export default useQueryAssets;
