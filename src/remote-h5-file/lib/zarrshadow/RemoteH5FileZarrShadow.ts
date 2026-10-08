/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reads an NWB file through a zarrshadow reference file: Zarr v3 metadata plus,
 * for every chunk, where its bytes are in the original file. The arrays are
 * read with zarrita, and the store from the zarrshadow package fetches the
 * bytes with range requests.
 *
 * This presents the references the way the rest of neurosift expects an HDF5
 * file: groups with attributes and children, datasets with numpy-style dtypes,
 * soft links followed, and object references as {_REFERENCE: {path}}.
 */
import * as zarr from "zarrita";
import { ReferenceStore } from "./store";
import { addRequestWatermark } from "../../../util/requestWatermark";
import { bigIntArrayToFloat64, isBigIntArray } from "../bigIntArrayToFloat64";
import { Canceler } from "../helpers";
import {
  DatasetDataType,
  globalRemoteH5FileStats,
  RemoteH5Dataset,
  RemoteH5Group,
  RemoteH5Subdataset,
  RemoteH5Subgroup,
} from "../RemoteH5File";

type NodeMetadata = {
  node_type: "group" | "array";
  attributes?: { [key: string]: any };
  shape?: number[];
  data_type?: any;
  chunk_grid?: { configuration?: { chunk_shape?: number[] } };
  codecs?: { name: string; configuration?: any }[];
};

type SoftLink = { name: string; source: string; path: string };

const maxSoftLinkHops = 20;

// The numpy-style dtype strings that the HDF5 and LINDI readers report
const numpyDtypes: { [dataType: string]: string } = {
  bool: "|b1",
  int8: "|i1",
  uint8: "|u1",
  int16: "<i2",
  uint16: "<u2",
  int32: "<i4",
  uint32: "<u4",
  int64: "<i8",
  uint64: "<u8",
  float16: "<f2",
  float32: "<f4",
  float64: "<f8",
  string: "|O",
};

const toNumpyDtype = (dataType: any): string => {
  if (typeof dataType === "string") return numpyDtypes[dataType] ?? dataType;
  // a compound type: a record of named fields
  if (dataType?.name === "struct" || dataType?.name === "structured")
    return "|V";
  return String(dataType?.name ?? "");
};

const withoutSlashes = (path: string) => path.replace(/^\/+|\/+$/g, "");

const nameOf = (path: string) => path.split("/").slice(-1)[0];

const product = (x: number[]) => x.reduce((a, b) => a * b, 1);

class RemoteH5FileZarrShadow {
  #sourceUrls: string[] | undefined = undefined;
  #metadata = new Map<string, Promise<NodeMetadata | undefined>>();
  #arrays = new Map<
    string,
    Promise<zarr.Array<zarr.DataType, ReferenceStore>>
  >();
  constructor(
    public url: string,
    private store: ReferenceStore,
  ) {}

  static async create(url: string) {
    const store = await ReferenceStore.fromUrl(url, {
      // Tag the requests to the object stores, as the other readers do
      fetch: (input, init) => fetch(addRequestWatermark(input), init),
    });
    return new RemoteH5FileZarrShadow(url, store);
  }

  get dataIsRemote() {
    return !this.url.startsWith("http://localhost");
  }

  /** The zarr.json of a group or array, or undefined if there is none at path. */
  #meta(path: string): Promise<NodeMetadata | undefined> {
    let meta = this.#metadata.get(path);
    if (!meta) {
      const key = (
        path === "" ? "/zarr.json" : `/${path}/zarr.json`
      ) as `/${string}`;
      meta = this.store
        .get(key)
        .then((bytes) =>
          bytes ? JSON.parse(new TextDecoder().decode(bytes)) : undefined,
        );
      this.#metadata.set(path, meta);
    }
    return meta;
  }

  /**
   * Follow soft links. An HDF5 soft link is recorded in its parent group's
   * _LINKS attribute, as a name and the path it stands for. A link can be any
   * component of a path, so each prefix is checked, shortest first, and the
   * rest of the path is put back on the target.
   */
  async resolveSoftLink(path: string): Promise<string> {
    let p = withoutSlashes(path);
    for (let hop = 0; hop < maxSoftLinkHops; hop++) {
      const parts = p === "" ? [] : p.split("/");
      let redirected = false;
      for (let i = 0; i < parts.length; i++) {
        const parent = await this.#meta(parts.slice(0, i).join("/"));
        const links: SoftLink[] = parent?.attributes?._LINKS ?? [];
        const link = links.find((x) => x.name === parts[i]);
        if (!link) continue;
        p = [withoutSlashes(link.path), ...parts.slice(i + 1)]
          .filter((x) => x !== "")
          .join("/");
        redirected = true;
        break;
      }
      if (!redirected) return p;
    }
    console.warn(`Too many soft link hops while resolving ${path}`);
    return p;
  }

  #describeDataset(
    name: string,
    path: string,
    meta: NodeMetadata,
  ): RemoteH5Subdataset {
    // bytes and transpose say how values are laid out, not how they are compressed
    const codecs = (meta.codecs ?? [])
      .map((codec) => codec.name.replace(/^numcodecs\./, ""))
      .filter((n) => !["bytes", "transpose", "vlen-utf8"].includes(n));
    const { _LINKS: _, ...attrs } = meta.attributes ?? {};
    return {
      name,
      path,
      shape: meta.shape ?? [],
      dtype: toNumpyDtype(meta.data_type),
      attrs,
      chunks: meta.chunk_grid?.configuration?.chunk_shape,
      compressor: codecs.length > 0 ? codecs[codecs.length - 1] : undefined,
      filters: codecs.length > 1 ? codecs.slice(0, -1) : undefined,
    };
  }

  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    const requested = withoutSlashes(path);
    const resolved = await this.resolveSoftLink(requested);
    const meta = await this.#meta(resolved);
    globalRemoteH5FileStats.getGroupCount++;
    if (!meta || meta.node_type !== "group") return undefined;

    // Children are reported under the path that was asked for, so that the
    // children of a linked group carry the link's path, as in HDF5.
    const childPath = (name: string) =>
      "/" + (requested === "" ? name : `${requested}/${name}`);
    const links: SoftLink[] = meta.attributes?._LINKS ?? [];
    const names = [
      ...this.store.children(resolved),
      ...links.map((link) => link.name),
    ];
    const subgroups: RemoteH5Subgroup[] = [];
    const datasets: RemoteH5Subdataset[] = [];
    for (const name of names) {
      const target = await this.resolveSoftLink(
        resolved === "" ? name : `${resolved}/${name}`,
      );
      const child = await this.#meta(target);
      if (!child) {
        console.warn(`Nothing found at ${target} for ${childPath(name)}`);
        continue;
      }
      if (child.node_type === "array") {
        datasets.push(this.#describeDataset(name, childPath(name), child));
      } else {
        const { _LINKS: _, ...attrs } = child.attributes ?? {};
        subgroups.push({ name, path: childPath(name), attrs });
      }
    }
    const { _LINKS: _, ...attrs } = meta.attributes ?? {};
    return { path: path === "" ? "/" : path, subgroups, datasets, attrs };
  }

  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    const resolved = await this.resolveSoftLink(path);
    const meta = await this.#meta(resolved);
    globalRemoteH5FileStats.getDatasetCount++;
    if (!meta || meta.node_type !== "array") return undefined;
    return this.#describeDataset(nameOf(withoutSlashes(path)), path, meta);
  }

  async getDatasetData(
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ): Promise<DatasetDataType | undefined> {
    for (const ss of o.slice ?? []) {
      if (isNaN(ss[0]) || isNaN(ss[1])) {
        console.warn("Invalid slice", path, o.slice);
        throw Error("Invalid slice");
      }
    }
    const resolved = await this.resolveSoftLink(path);
    const meta = await this.#meta(resolved);
    if (!meta || meta.node_type !== "array") {
      console.warn("No array for", path);
      return undefined;
    }
    globalRemoteH5FileStats.getDatasetDataCount++;

    let array = this.#arrays.get(resolved);
    if (!array) {
      array = zarr.open.v3(zarr.root(this.store).resolve(resolved), {
        kind: "array",
      });
      this.#arrays.set(resolved, array);
      array.catch(() => this.#arrays.delete(resolved));
    }
    const arr = await array;

    const controller = new AbortController();
    o.canceler?.onCancel.push(() => controller.abort());
    const shape = meta.shape ?? [];
    const isReference = meta.attributes?._DTYPE === "object_reference";
    const convert = (values: any): any => {
      if (isReference) {
        // An object reference is stored as the path of its target
        return globalThis.Array.from(values as string[], (target) => ({
          _REFERENCE: { source: ".", path: target },
        }));
      }
      if (!o.allowBigInt && isBigIntArray(values))
        return bigIntArrayToFloat64(values);
      return values;
    };

    if (shape.length === 0) {
      // A scalar dataset: the value itself
      const chunk = await arr.getChunk([], { signal: controller.signal });
      const values = convert(toPlainArray(chunk.data));
      return values[0];
    }
    const selection = shape.map((_, i) => {
      const ss = o.slice?.[i];
      return ss ? zarr.slice(ss[0], ss[1]) : null;
    });
    const result = await zarr.get(arr, selection, {
      opts: { signal: controller.signal },
    });
    return convert(inCOrder(result as any));
  }

  getUrls() {
    return [this.url];
  }
  get sourceUrls(): string[] | undefined {
    return this.#sourceUrls;
  }
  set sourceUrls(v: string[] | undefined) {
    this.#sourceUrls = v;
  }
}

/** zarrita's own array classes (booleans, fixed-length strings) as plain arrays. */
const toPlainArray = (data: any): any => {
  if (ArrayBuffer.isView(data) || globalThis.Array.isArray(data)) return data;
  // Booleans come out as true and false, as the HDF5 reader returns them
  return globalThis.Array.from(data as Iterable<unknown>);
};

/**
 * The values of what zarrita read, in C order. For an array stored with the
 * transpose codec zarrita returns the chunk's own layout and the strides that
 * describe it, so the strides are followed here.
 */
const inCOrder = (result: {
  data: any;
  shape: number[];
  stride: number[];
}): any => {
  const data = toPlainArray(result.data);
  const { shape, stride } = result;
  let expected = 1;
  let isCOrder = true;
  for (let axis = shape.length - 1; axis >= 0; axis--) {
    if (stride[axis] !== expected) isCOrder = false;
    expected *= shape[axis];
  }
  if (isCOrder) return data;
  const size = product(shape);
  const out = new data.constructor(size);
  const index = shape.map(() => 0);
  for (let n = 0; n < size; n++) {
    let at = 0;
    for (let axis = 0; axis < shape.length; axis++)
      at += index[axis] * stride[axis];
    out[n] = data[at];
    for (let axis = shape.length - 1; axis >= 0; axis--) {
      if (++index[axis] < shape[axis]) break;
      index[axis] = 0;
    }
  }
  return out;
};

const globalZarrShadowFiles: { [url: string]: RemoteH5FileZarrShadow } = {};
export const getRemoteH5FileZarrShadow = async (url: string) => {
  if (!globalZarrShadowFiles[url]) {
    globalZarrShadowFiles[url] = await RemoteH5FileZarrShadow.create(url);
  }
  return globalZarrShadowFiles[url];
};

/** Whether a url names a zarrshadow reference file or the folder that holds one. */
export const isZarrShadowUrl = (url: string) => {
  const u = url.split("?")[0].replace(/\/+$/, "");
  return (
    u.endsWith(".zarrshadow") ||
    u.endsWith(".zarrshadow.json") ||
    u.endsWith("/refs.json")
  );
};

export default RemoteH5FileZarrShadow;
