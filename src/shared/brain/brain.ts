import { useEffect, useState } from "react";

/** Neurosift Brain: DANDI data by brain region, in 3D. Opens dark unless someone chose another theme there. */
export const BRAIN_URL = (() => {
  const url =
    import.meta.env.VITE_NEUROSIFT_BRAIN_URL ??
    "https://jguerrero-prog.github.io/dandi-atlas/";
  return url.endsWith("/") ? url : `${url}/`;
})();

type AtlasIndex = { atlases: { key: string; dandisets: string[] }[] };

const isIndex = (data: unknown): data is AtlasIndex =>
  typeof data === "object" &&
  data !== null &&
  Array.isArray((data as { atlases?: unknown }).atlases) &&
  (data as AtlasIndex).atlases.every(
    (atlas) =>
      typeof atlas?.key === "string" &&
      Array.isArray(atlas.dandisets) &&
      atlas.dandisets.every((id) => typeof id === "string"),
  );

let atlases: Promise<Map<string, string>> | null = null;

/**
 * Which Brain atlas holds each dandiset, read once from Brain's own index. The first atlas listed wins,
 * so a dandiset in both a macaque atlas and another opens in the first. Empty if Brain can't be reached.
 */
export function brainAtlases(): Promise<Map<string, string>> {
  atlases ??= fetch(`${BRAIN_URL}data/atlases_index.json`)
    .then((response) => (response.ok ? response.json() : null))
    .then((data: unknown) => {
      const byDandiset = new Map<string, string>();
      if (!isIndex(data)) return byDandiset;
      for (const atlas of data.atlases)
        for (const id of atlas.dandisets)
          if (!byDandiset.has(id)) byDandiset.set(id, atlas.key);
      return byDandiset;
    })
    .catch(() => new Map());
  return atlases;
}

/** For tests: forget the index so the next call reads it again. */
export const resetBrainAtlases = () => {
  atlases = null;
};

/** Brain's address for a dandiset, or for one of its files, in the atlas that holds it. */
export const brainHref = (
  atlas: string,
  dandisetId: string,
  assetId?: string,
) =>
  `${BRAIN_URL}?atlas=${atlas}#dandiset=${dandisetId}${assetId ? `&session=${assetId}` : ""}`;

/** The DANDI asset id in a file's download address, such as …/api/assets/<id>/download/. */
export const assetIdFromUrl = (url: string) =>
  /\/assets\/([0-9a-f-]{36})\/download\/?/i.exec(url)?.[1];

/**
 * The "View in BRAIN" address for a dandiset or one of its files, once Brain's index says it can place
 * the dandiset; undefined otherwise, so the link only shows where Brain has something to show.
 */
export function useBrainLink(dandisetId?: string, assetId?: string) {
  const [atlas, setAtlas] = useState<{ id: string; key?: string }>();
  useEffect(() => {
    if (!dandisetId) return undefined;
    let current = true;
    brainAtlases().then((map) => {
      if (current) setAtlas({ id: dandisetId, key: map.get(dandisetId) });
    });
    return () => {
      current = false;
    };
  }, [dandisetId]);
  if (!dandisetId || atlas?.id !== dandisetId || !atlas.key) return undefined;
  return brainHref(atlas.key, dandisetId, assetId);
}
