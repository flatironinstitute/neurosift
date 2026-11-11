import { useEffect, useState } from "react";
import { DandisetSearchResultItem } from "../DandiPage/dandi-types";
import getAuthorizationHeaderForUrl from "../util/getAuthorizationHeaderForUrl";

/** Why a Dandiset couldn't be loaded: the archive's status, when it answered, and a sentence for people. */
export type DandisetFailure = { status?: number; url: string; message: string };

type DandisetResult = {
  dandiset: DandisetSearchResultItem | undefined;
  failure: DandisetFailure | undefined;
};

const NOTHING: DandisetResult = { dandiset: undefined, failure: undefined };

const dandisetUrl = (id: string, staging?: boolean, ember?: boolean) =>
  ember
    ? `https://api-dandi.emberarchive.org/api/dandisets/${id}`
    : `https://api${staging ? ".sandbox" : ""}.dandiarchive.org/api/dandisets/${id}`;

/** Loads a Dandiset from DANDI or EMBER, and says why when it can't. */
export const useDandisetResult = (
  dandisetId: string | undefined,
  useStaging: boolean | undefined,
  useEmber: boolean | undefined,
): DandisetResult => {
  const [result, setResult] = useState<DandisetResult>(NOTHING);
  useEffect(() => {
    let canceled = false;
    setResult(NOTHING);
    if (!dandisetId) return;
    const url = dandisetUrl(dandisetId, useStaging, useEmber);
    const archive = useEmber ? "EMBER" : "DANDI";
    const fail = (failure: DandisetFailure) => {
      if (!canceled) setResult({ dandiset: undefined, failure });
    };
    (async () => {
      const authorization = getAuthorizationHeaderForUrl(url);
      try {
        const response = await fetch(url, {
          headers: authorization ? { Authorization: authorization } : undefined,
        });
        if (canceled) return;
        if (response.status === 200) {
          const dandiset = (await response.json()) as DandisetSearchResultItem;
          if (!canceled) setResult({ dandiset, failure: undefined });
          return;
        }
        const { status } = response;
        fail({
          status,
          url,
          message:
            status === 404
              ? `${archive} has no Dandiset ${dandisetId} (404).`
              : `${archive} answered ${status} for Dandiset ${dandisetId}.`,
        });
      } catch (e) {
        fail({ url, message: e instanceof Error ? e.message : String(e) });
      }
    })();
    return () => {
      canceled = true;
    };
  }, [dandisetId, useStaging, useEmber]);
  return result;
};

/** The Dandiset, undefined while loading, or null when it couldn't be loaded. */
export const useQueryDandiset = (
  dandisetId: string | undefined,
  useStaging: boolean | undefined,
  useEmber: boolean | undefined,
) => {
  const { dandiset, failure } = useDandisetResult(
    dandisetId,
    useStaging,
    useEmber,
  );
  return failure ? null : dandiset;
};

export default useQueryDandiset;
