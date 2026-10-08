/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Zarr v2 stores, as hdmf-zarr wrote them before version 0.14, which is what
 * the NWB Zarr assets on DANDI are as of October 2026.
 *
 * hdmf-zarr marked what Zarr lacks differently then. This reads a v2 store
 * through its consolidated metadata (.zmetadata) and describes each node the
 * way the Zarr v3 files do, so that the reader has one form to deal with:
 *
 *  - A group's zarr_link attribute becomes _LINKS.
 *  - An attribute {zarr_dtype: "object", value: {path}} becomes
 *    {_REFERENCE: {path}}.
 *  - A dataset with zarr_dtype "scalar" holds one value in an array of one.
 *  - A dataset with zarr_dtype "object" holds object references.
 */
import * as zarr from "zarrita";
import type { AsyncReadable } from "zarrita";
import { addRequestWatermark } from "../../../util/requestWatermark";

export type Zarr2NodeMetadata = {
  node_type: "group" | "array";
  attributes: { [key: string]: any };
  shape?: number[];
  /** The numpy dtype string of a v2 array, which is what the HDF5 reader reports too. */
  dtype?: string;
  chunks?: number[];
  compressor?: string;
  filters?: string[];
  /** One value, stored in an array of one. */
  scalar?: boolean;
  /** Every value is an object reference. */
  references?: boolean;
  /** Why the values cannot be read, if they cannot. */
  unreadable?: string;
};

export type Zarr2Source = {
  store: AsyncReadable;
  children: (path: string) => string[];
  meta: (path: string) => Promise<Zarr2NodeMetadata | undefined>;
  openArray: (
    path: string,
  ) => Promise<zarr.Array<zarr.DataType, AsyncReadable>>;
};

const reference = (value: any) => ({
  _REFERENCE: { source: value?.source ?? ".", path: value?.path },
});

/** Whether a value is an object reference as hdmf-zarr wrote one in Zarr v2. */
const isReferenceValue = (value: any) =>
  value !== null && typeof value === "object" && typeof value.path === "string";

export const translateAttributes = (zattrs: { [key: string]: any }) => {
  const attributes: { [key: string]: any } = {};
  for (const [key, value] of Object.entries(zattrs)) {
    if (key === "zarr_dtype") continue; // it describes the dataset, and is read separately
    if (key === "zarr_link") {
      // A link to another file cannot be followed here
      attributes._LINKS = (value as any[])
        .filter((link) => link.source === "." || link.source === undefined)
        .map((link) => ({ name: link.name, source: ".", path: link.path }));
    } else if (
      value !== null &&
      typeof value === "object" &&
      value.zarr_dtype === "object" &&
      isReferenceValue(value.value)
    ) {
      attributes[key] = reference(value.value);
    } else {
      attributes[key] = value;
    }
  }
  return attributes;
};

export const translateArray = (
  zarray: any,
  zattrs: { [key: string]: any },
): Zarr2NodeMetadata => {
  const kind = zattrs.zarr_dtype;
  const filters: string[] = (zarray.filters ?? []).map((f: any) => f.id);
  let unreadable: string | undefined;
  if (filters.includes("pickle")) unreadable = "its values are Python pickles";
  else if (typeof zarray.dtype !== "string" || globalThis.Array.isArray(kind))
    unreadable = "it has a compound type";
  const scalar = kind === "scalar";
  return {
    node_type: "array",
    attributes: translateAttributes(zattrs),
    shape: scalar ? [] : zarray.shape,
    dtype: typeof zarray.dtype === "string" ? zarray.dtype : "|V",
    chunks: zarray.chunks,
    compressor: zarray.compressor?.id,
    filters: filters.length > 0 ? filters : undefined,
    scalar,
    references: kind === "object",
    unreadable,
  };
};

/** Values of a dataset of object references, as the paths they point at. */
export const toReferences = (values: any[]) =>
  globalThis.Array.from(values, (value) =>
    isReferenceValue(value) ? reference(value) : value,
  );

/**
 * numcodecs' vlen-bytes: a count, then each item as its length and its
 * bytes. hdmf-zarr used it for text, so the items are decoded as UTF-8.
 */
class VLenBytes {
  kind = "array_to_bytes" as const;
  constructor(private shape: number[]) {}
  static fromConfig(_: unknown, meta: { shape: number[] }) {
    return new VLenBytes(meta.shape);
  }
  encode(): never {
    throw new Error("The vlen-bytes codec is read-only");
  }
  decode(bytes: Uint8Array) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const decoder = new TextDecoder();
    const data: string[] = new globalThis.Array(view.getUint32(0, true));
    let at = 4;
    for (let i = 0; i < data.length; i++) {
      const length = view.getUint32(at, true);
      at += 4;
      data[i] = decoder.decode(bytes.subarray(at, at + length));
      at += length;
    }
    const stride = this.shape.map((_, axis) =>
      this.shape.slice(axis + 1).reduce((a, b) => a * b, 1),
    );
    return { data, shape: this.shape, stride };
  }
}

const registerCodecs = () => {
  const codecs = zarr.registry as unknown as Map<string, () => unknown>;
  if (!codecs.has("numcodecs.vlen-bytes"))
    codecs.set("numcodecs.vlen-bytes", () => VLenBytes);
};

const nonFinite: { [token: string]: number } = {
  NaN: NaN,
  Infinity: Infinity,
  "-Infinity": -Infinity,
};
const sentinel = "@@non-finite@@";

/**
 * Parse JSON that Python wrote. Python writes NaN and the infinities as bare
 * words, which JSON does not have and JSON.parse refuses. Zarr v2 metadata
 * holds them wherever an attribute is not a number.
 */
export const parsePythonJson = (text: string): any => {
  // A string is matched whole, so that the words are only replaced outside of one
  const quoted = text.replace(/"(?:[^"\\]|\\.)*"|-?Infinity|NaN/g, (token) =>
    token.startsWith('"') ? token : `"${sentinel}${token}"`,
  );
  return JSON.parse(quoted, (_, value) =>
    typeof value === "string" && value.startsWith(sentinel)
      ? nonFinite[value.slice(sentinel.length)]
      : value,
  );
};

/** JSON with NaN and the infinities as strings, which is how Zarr v2 writes a fill value. */
const toJson = (value: unknown) =>
  JSON.stringify(value, (_, x) =>
    typeof x === "number" && !Number.isFinite(x) ? String(x) : x,
  );

/** Open a Zarr v2 store that has consolidated metadata. */
export const openZarr2Source = async (base: string): Promise<Zarr2Source> => {
  registerCodecs();
  const response = await fetch(addRequestWatermark(`${base}/.zmetadata`));
  if (!response.ok)
    throw new Error(`HTTP ${response.status} for its .zmetadata`);
  const metadata: { [key: string]: any } = parsePythonJson(
    await response.text(),
  ).metadata;

  // zarrita reads each array's metadata from the store, so the store answers
  // for the keys of the consolidated metadata without going to the network.
  const fetchStore = new zarr.FetchStore(base, {
    fetch: (request) => fetch(addRequestWatermark(request.url), request),
  });
  const encoder = new TextEncoder();
  const store: AsyncReadable = {
    get: async (key, opts) => {
      const node = metadata[key.replace(/^\/+/, "")];
      if (node !== undefined) return encoder.encode(toJson(node));
      return fetchStore.get(key, opts);
    },
    getRange: (key, range, opts) => fetchStore.getRange(key, range, opts),
  };

  const childrenOf = new Map<string, string[]>();
  for (const key of Object.keys(metadata)) {
    if (!key.endsWith("/.zgroup") && !key.endsWith("/.zarray")) continue;
    const node = key.slice(0, key.lastIndexOf("/"));
    const cut = node.lastIndexOf("/");
    const parent = cut < 0 ? "" : node.slice(0, cut);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)?.push(node.slice(cut + 1));
  }
  const prefix = (path: string) => (path === "" ? "" : `${path}/`);
  return {
    store,
    children: (path) => [...(childrenOf.get(path) ?? [])].sort(),
    meta: async (path) => {
      const zattrs = metadata[`${prefix(path)}.zattrs`] ?? {};
      const zarray = metadata[`${prefix(path)}.zarray`];
      if (zarray) return translateArray(zarray, zattrs);
      if (!metadata[`${prefix(path)}.zgroup`]) return undefined;
      return { node_type: "group", attributes: translateAttributes(zattrs) };
    },
    openArray: (path) =>
      zarr.open.v2(zarr.root(store).resolve(path), { kind: "array" }),
  };
};
