/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Reads an NWB file as Zarr v3, with zarrita. The file is one of two things:
 *
 *  - A Zarr store that hdmf-zarr wrote, read through its consolidated
 *    metadata. A Zarr v2 store, from hdmf-zarr before 0.14, marks links and
 *    references in an earlier way, which zarr2Source describes in the v3 form.
 *  - A zarrshadow reference file: Zarr v3 metadata plus, for every chunk,
 *    where its bytes are in the original HDF5 file. The store from the
 *    zarrshadow package fetches those bytes with range requests.
 *
 * Both mark what Zarr lacks the same way: soft links in a group's _LINKS
 * attribute, object references as {_REFERENCE: {path}} in attributes and as
 * the target's path in datasets, and compound types as the struct data type.
 * This presents them the way the rest of neurosift expects an HDF5 file.
 */
import * as zarr from "zarrita";
import type { AsyncReadable } from "zarrita";
import { ReferenceStore } from "./store";
import { openZarr2Source, toReferences, Zarr2Source } from "./zarr2Source";
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
  // For an array of a Zarr v2 store, described by zarr2Source
  dtype?: string;
  chunks?: number[];
  compressor?: string;
  filters?: string[];
  scalar?: boolean;
  references?: boolean;
  unreadable?: string;
};

type SoftLink = { name: string; source: string; path: string };

/** Where the nodes and chunks of the file come from. */
type Source = {
  store: AsyncReadable;
  /** The names of the groups and arrays directly inside the group at path. */
  children: (path: string) => string[];
  /** For a Zarr v2 store: the metadata of a node, and its array, in place of zarr.json. */
  zarr2?: Zarr2Source;
};

type StructType = {
  name: string;
  configuration: {
    fields: ({ name: string; data_type: any } | [string, any])[];
  };
};

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

/** A compound type. It was named structured, with fields as pairs, before struct was registered. */
const isStruct = (dataType: any): dataType is StructType =>
  dataType?.name === "struct" || dataType?.name === "structured";

const toNumpyDtype = (dataType: any): string => {
  if (typeof dataType === "string") return numpyDtypes[dataType] ?? dataType;
  if (isStruct(dataType)) return "|V";
  return String(dataType?.name ?? "");
};

const withoutSlashes = (path: string) => path.replace(/^\/+|\/+$/g, "");

const nameOf = (path: string) => path.split("/").slice(-1)[0];

const product = (x: number[]) => x.reduce((a, b) => a * b, 1);

class RemoteH5FileZarr3 {
  #sourceUrls: string[] | undefined = undefined;
  #metadata = new Map<string, Promise<NodeMetadata | undefined>>();
  #arrays = new Map<
    string,
    Promise<zarr.Array<zarr.DataType, AsyncReadable>>
  >();
  constructor(
    public url: string,
    private source: Source,
  ) {}

  static async create(url: string) {
    return isZarrShadowUrl(url)
      ? RemoteH5FileZarr3.createFromReferences(url)
      : RemoteH5FileZarr3.createFromZarr(url);
  }

  /** A zarrshadow reference file, or the folder that holds one. */
  static async createFromReferences(url: string) {
    const store = await ReferenceStore.fromUrl(url, {
      // Tag the requests to the object stores, as the other readers do
      fetch: (input, init) => fetch(addRequestWatermark(input), init),
    });
    return new RemoteH5FileZarr3(url, {
      store,
      children: (path) => store.children(path),
    });
  }

  /**
   * A Zarr store that hdmf-zarr wrote, with consolidated metadata: Zarr v3
   * from version 0.14, and Zarr v2 before it.
   */
  static async createFromZarr(url: string) {
    const base = url.split("?")[0].replace(/\/+$/, "");
    const fetchStore = new zarr.FetchStore(base, {
      fetch: (request) => fetch(addRequestWatermark(request.url), request),
    });
    let store;
    try {
      store = await zarr.withConsolidatedMetadata(fetchStore, {
        format: "v3",
      });
    } catch (noZarr3) {
      // No zarr.json with consolidated metadata: a Zarr v2 store, if anything
      let zarr2;
      try {
        zarr2 = await openZarr2Source(base);
      } catch (noZarr2) {
        throw new Error(
          `${base} is not a Zarr store with consolidated metadata, which is what this reader needs. As Zarr v3: ${noZarr3}. As Zarr v2: ${noZarr2}`,
        );
      }
      return new RemoteH5FileZarr3(url, {
        store: zarr2.store,
        children: zarr2.children,
        zarr2,
      });
    }
    // The consolidated metadata lists every node, which gives each group's children
    const childrenOf = new Map<string, string[]>();
    for (const { path } of store.contents()) {
      const node = withoutSlashes(path);
      if (node === "") continue;
      const cut = node.lastIndexOf("/");
      const parent = cut < 0 ? "" : node.slice(0, cut);
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent)?.push(node.slice(cut + 1));
    }
    return new RemoteH5FileZarr3(url, {
      store: store as AsyncReadable,
      children: (path) => [...(childrenOf.get(path) ?? [])].sort(),
    });
  }

  get dataIsRemote() {
    return !this.url.startsWith("http://localhost");
  }

  /** The zarr.json of a group or array, or undefined if there is none at path. */
  #meta(path: string): Promise<NodeMetadata | undefined> {
    let meta = this.#metadata.get(path);
    if (!meta && this.source.zarr2) {
      meta = this.source.zarr2.meta(path);
      this.#metadata.set(path, meta);
    }
    if (!meta) {
      const key = (
        path === "" ? "/zarr.json" : `/${path}/zarr.json`
      ) as `/${string}`;
      meta = Promise.resolve(this.source.store.get(key)).then((bytes) =>
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
    if (meta.dtype !== undefined) {
      // A Zarr v2 array, which names these things as the HDF5 reader does
      return {
        name,
        path,
        shape: meta.shape ?? [],
        dtype: meta.dtype,
        attrs,
        chunks: meta.chunks,
        compressor: meta.compressor,
        filters: meta.filters,
      };
    }
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
      ...this.source.children(resolved),
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
    if (meta.unreadable) {
      console.warn(`${path} cannot be read: ${meta.unreadable}`);
      return undefined;
    }

    if ((meta.shape ?? []).some((n) => n === 0)) {
      // Nothing is stored for an empty dataset, and zarrita refuses an empty selection
      return [] as unknown as DatasetDataType;
    }

    const zarr2 = this.source.zarr2;
    const compound = isStruct(meta.data_type);
    let array = this.#arrays.get(resolved);
    if (!array) {
      if (zarr2) array = zarr2.openArray(resolved);
      else if (compound)
        array = Promise.resolve(
          recordBytesArray(this.source.store, resolved, meta),
        );
      else
        array = zarr.open.v3(zarr.root(this.source.store).resolve(resolved), {
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
    if (meta.scalar || meta.references) {
      // Zarr v2: a scalar is an array of one, and references are objects
      const result = await zarr.get(arr, null, {
        opts: { signal: controller.signal },
      });
      let values = toPlainArray(result.data);
      if (meta.references) values = toReferences(values);
      else if (!o.allowBigInt && isBigIntArray(values))
        values = bigIntArrayToFloat64(values);
      if (meta.scalar) return values[0];
      const start = o.slice?.[0]?.[0] ?? 0;
      const stop = o.slice?.[0]?.[1] ?? values.length;
      return values.slice(start, stop);
    }
    const convert = (values: any): any => {
      if (compound) {
        const endian = meta.codecs?.find((codec) => codec.name === "bytes")
          ?.configuration?.endian;
        return decodeRecords(
          values,
          meta.data_type,
          endian !== "big",
          meta.attributes?._REFERENCE_FIELDS ?? [],
        );
      }
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

    if (shape.length === 0 && !compound) {
      // A scalar dataset: the value itself
      const chunk = await arr.getChunk([], { signal: controller.signal });
      const values = convert(toPlainArray(chunk.data));
      return values[0];
    }
    const selection: (zarr.Slice | null)[] = shape.map((_, i) => {
      const ss = o.slice?.[i];
      return ss ? zarr.slice(ss[0], ss[1]) : null;
    });
    // The bytes of a record are one more axis, which is read whole
    if (compound) selection.push(null);
    const result = await zarr.get(arr, selection, {
      opts: { signal: controller.signal },
    });
    const values = convert(inCOrder(result as any));
    return shape.length === 0 ? values[0] : values;
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

const fieldsOf = (dataType: StructType): { name: string; dataType: any }[] =>
  dataType.configuration.fields.map((field) =>
    globalThis.Array.isArray(field)
      ? { name: field[0], dataType: field[1] }
      : { name: field.name, dataType: field.data_type },
  );

const numberFields: {
  [dataType: string]: [number, (v: DataView, at: number, le: boolean) => any];
} = {
  int8: [1, (v, at) => v.getInt8(at)],
  uint8: [1, (v, at) => v.getUint8(at)],
  bool: [1, (v, at) => v.getUint8(at) !== 0],
  int16: [2, (v, at, le) => v.getInt16(at, le)],
  uint16: [2, (v, at, le) => v.getUint16(at, le)],
  int32: [4, (v, at, le) => v.getInt32(at, le)],
  uint32: [4, (v, at, le) => v.getUint32(at, le)],
  int64: [8, (v, at, le) => Number(v.getBigInt64(at, le))],
  uint64: [8, (v, at, le) => Number(v.getBigUint64(at, le))],
  float32: [4, (v, at, le) => v.getFloat32(at, le)],
  float64: [8, (v, at, le) => v.getFloat64(at, le)],
};

/** The size in bytes of one value of a field. The fields of a record are packed, with no padding. */
const fieldSize = (dataType: any): number => {
  if (typeof dataType === "string" && dataType in numberFields)
    return numberFields[dataType][0];
  if (isStruct(dataType))
    return fieldsOf(dataType).reduce((n, f) => n + fieldSize(f.dataType), 0);
  const size = dataType?.configuration?.length_bytes;
  const isText = ["fixed_length_utf32", "null_terminated_bytes"].includes(
    dataType?.name,
  );
  if (isText && typeof size === "number") return size;
  throw Error(
    `Unsupported field type in a compound dataset: ${JSON.stringify(dataType)}`,
  );
};

/**
 * zarrita does not read the struct data type yet
 * (https://github.com/manzt/zarrita.js/pull/464). Until it does, a compound
 * array is opened as bytes: the same chunks and codecs, with the bytes of a
 * record as one more axis. decodeRecords then reads the fields.
 *
 * The extra axis adds a coordinate to every chunk key, always 0, which the
 * store given to zarrita takes off again.
 */
const recordBytesArray = (
  store: AsyncReadable,
  path: string,
  meta: NodeMetadata,
): zarr.Array<zarr.DataType, AsyncReadable> => {
  const size = fieldSize(meta.data_type);
  const chunkShape = meta.chunk_grid?.configuration?.chunk_shape ?? [];
  const chunks = `/${path}/c`;
  const stored = (key: string) =>
    (key.startsWith(chunks) ? key.replace(/\/0$/, "") : key) as `/${string}`;
  const asBytes: AsyncReadable = {
    get: (key, opts) => store.get(stored(key), opts),
    getRange: store.getRange
      ? (key, range, opts) => store.getRange!(stored(key), range, opts)
      : undefined,
  };
  return new zarr.Array(asBytes, `/${path}`, {
    ...(meta as any),
    data_type: "uint8",
    shape: [...(meta.shape ?? []), size],
    chunk_grid: {
      name: "regular",
      configuration: { chunk_shape: [...chunkShape, size] },
    },
    fill_value: 0,
  });
};

/**
 * The rows of a compound dataset from their bytes, each row as the values of
 * its fields in order, which is how the LINDI reader returns them. A field
 * that holds an object reference becomes {_REFERENCE: {path}}.
 */
const decodeRecords = (
  bytes: Uint8Array,
  dataType: StructType,
  littleEndian: boolean,
  referenceFields: string[],
): any[] => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const read = (type: any, at: number, isReference: boolean): any => {
    if (typeof type === "string")
      return numberFields[type][1](view, at, littleEndian);
    if (isStruct(type)) return readRecord(type, at, []);
    const size = type.configuration.length_bytes;
    let text = "";
    if (type.name === "fixed_length_utf32") {
      for (let i = 0; i < size; i += 4) {
        const point = view.getUint32(at + i, littleEndian);
        if (point !== 0) text += String.fromCodePoint(point);
      }
    } else {
      const raw = bytes.subarray(at, at + size);
      const end = raw.indexOf(0);
      text = new TextDecoder().decode(end < 0 ? raw : raw.subarray(0, end));
    }
    return isReference ? { _REFERENCE: { source: ".", path: text } } : text;
  };
  const readRecord = (type: StructType, at: number, references: string[]) => {
    const row: any[] = [];
    for (const field of fieldsOf(type)) {
      row.push(read(field.dataType, at, references.includes(field.name)));
      at += fieldSize(field.dataType);
    }
    return row;
  };
  const size = fieldSize(dataType);
  const rows = [];
  for (let at = 0; at + size <= bytes.length; at += size)
    rows.push(readRecord(dataType, at, referenceFields));
  return rows;
};

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

const globalZarr3Files: { [url: string]: RemoteH5FileZarr3 } = {};
export const getRemoteH5FileZarr3 = async (url: string) => {
  if (!globalZarr3Files[url]) {
    globalZarr3Files[url] = await RemoteH5FileZarr3.create(url);
  }
  return globalZarr3Files[url];
};

/**
 * Whether a url names a Zarr store: a folder whose name ends in .zarr, or a
 * Zarr asset in a DANDI bucket, which is at /zarr/<id>/.
 */
export const isZarrUrl = (url: string) => {
  const u = url.split("?")[0].replace(/\/+$/, "");
  return u.endsWith(".zarr") || /\/zarr\/[0-9a-f-]{36}$/.test(u);
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

export default RemoteH5FileZarr3;
