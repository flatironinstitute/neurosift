/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Zarr v3 stores, as hdmf-zarr writes them from version 0.14, read through the
 * consolidated metadata in the root zarr.json.
 *
 * The metadata is parsed here and not by zarrita, because zarr-python writes
 * an attribute that is not a finite number as a bare NaN or Infinity, which
 * JSON.parse refuses, and NWB files have them (the resolution of a
 * TimeSeries, for one).
 */
import * as zarr from "zarrita";
import type { AsyncReadable } from "zarrita";
import { addRequestWatermark } from "../../../util/requestWatermark";
import { parseJson } from "./store";
import { stringifyStrict } from "./zarr2Source";

export type Zarr3Source = {
  store: AsyncReadable;
  children: (path: string) => string[];
  meta: (path: string) => Promise<{ [key: string]: any } | undefined>;
};

/**
 * Open a Zarr v3 store that has consolidated metadata. Returns undefined if
 * the store has no root zarr.json, which is the case for a Zarr v2 store.
 */
export const openZarr3Source = async (
  base: string,
): Promise<Zarr3Source | undefined> => {
  const response = await fetch(addRequestWatermark(`${base}/zarr.json`));
  if (!response.ok) return undefined;
  const { consolidated_metadata: consolidated, ...root } = parseJson(
    await response.text(),
  ) as { [key: string]: any };
  if (!consolidated?.metadata)
    throw new Error(
      `${base} is a Zarr v3 store without consolidated metadata, which this reader needs`,
    );
  const metadata = new Map<string, { [key: string]: any }>([["", root]]);
  const childrenOf = new Map<string, string[]>();
  for (const [key, node] of Object.entries(consolidated.metadata)) {
    const path = key.replace(/^\/+|\/+$/g, "");
    if (path === "") continue;
    metadata.set(path, node as { [key: string]: any });
    const cut = path.lastIndexOf("/");
    const parent = cut < 0 ? "" : path.slice(0, cut);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)?.push(path.slice(cut + 1));
  }

  // zarrita reads each array's zarr.json from the store, so the store answers
  // for those keys from the consolidated metadata, in JSON that it can parse.
  const fetchStore = new zarr.FetchStore(base, {
    fetch: (request) => fetch(addRequestWatermark(request.url), request),
  });
  const encoder = new TextEncoder();
  const store: AsyncReadable = {
    get: async (key, opts) => {
      const name = key.replace(/^\/+/, "");
      if (name === "zarr.json" || name.endsWith("/zarr.json")) {
        const node = metadata.get(name.slice(0, -"zarr.json".length - 1));
        if (node !== undefined) return encoder.encode(stringifyStrict(node));
      }
      return fetchStore.get(key, opts);
    },
    getRange: (key, range, opts) => fetchStore.getRange(key, range, opts),
  };
  return {
    store,
    children: (path) => [...(childrenOf.get(path) ?? [])].sort(),
    meta: async (path) => metadata.get(path),
  };
};
