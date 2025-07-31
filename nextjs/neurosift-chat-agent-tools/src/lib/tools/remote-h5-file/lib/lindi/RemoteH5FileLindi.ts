/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DatasetDataType,
  RemoteH5Dataset,
  RemoteH5Group,
  RemoteH5Subdataset,
  RemoteH5Subgroup,
  // getRemoteH5File,
  globalRemoteH5FileStats,
} from "../RemoteH5File";
// import { Canceler } from "../helpers";

type Canceler = {
  onCancel: (() => void)[];
};

import ReferenceFileSystemClient, {
  ReferenceFileSystemObject,
  RemoteTarInterface,
  isReferenceFileSystemObject,
} from "./ReferenceFileSystemClient";
import lindiDatasetDataLoader from "./lindiDatasetDataLoader";
import zarrDecodeChunkArray from "./zarrDecodeChunkArray";

type ZMetaDataZAttrs = { [key: string]: any };

type ZMetaDataZGroup = {
  zarr_format: number;
};

export type ZMetaDataZArray = {
  chunks?: number[];
  compressor?: any;
  dtype?: string;
  fill_value?: any;
  filters?: any[];
  order?: "C" | "F";
  shape?: number[];
  zarr_format?: 2;
};

export class ZarrFileSystemClient {
  #fileContentCache: {
    [key: string]: { content: any | undefined; found: boolean };
  } = {};
  #inProgressReads: { [key: string]: boolean } = {};
  constructor(private url: string) {}
  async readJson(path: string): Promise<{ [key: string]: any } | undefined> {
    const buf = await this.readBinary(path, { decodeArray: false });
    if (!buf) return undefined;
    const text = new TextDecoder().decode(buf);
    try {
      return JSON.parse(text, (_key, value) => {
        if (value === "___NaN___") return NaN;
        return value;
      });
    } catch (e) {
      console.warn(text);
      throw Error("Failed to parse JSON for " + path + ": " + e);
    }
  }
  async readBinary(
    path: string,
    o: {
      decodeArray?: boolean;
      startByte?: number;
      endByte?: number;
      disableCache?: boolean;
    },
  ): Promise<any | undefined> {
    if (o.startByte !== undefined) {
      if (o.decodeArray)
        throw Error("Cannot decode array and read a slice at the same time");
      if (o.endByte === undefined)
        throw Error("If you specify startByte, you must also specify endByte");
    } else if (o.endByte !== undefined) {
      throw Error("If you specify endByte, you must also specify startByte");
    }
    if (
      o.endByte !== undefined &&
      o.startByte !== undefined &&
      o.endByte < o.startByte
    ) {
      throw Error(
        `endByte must be greater than or equal to startByte: ${o.startByte} ${o.endByte} for ${path}`,
      );
    }
    if (
      o.endByte !== undefined &&
      o.startByte !== undefined &&
      o.endByte === o.startByte
    ) {
      return new ArrayBuffer(0);
    }
    const kk =
      path +
      "|" +
      (o.decodeArray ? "decode" : "") +
      "|" +
      o.startByte +
      "|" +
      o.endByte;
    while (this.#inProgressReads[kk]) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    this.#inProgressReads[kk] = true;
    try {
      if (path.startsWith("/")) path = path.slice(1);
      if (this.#fileContentCache[kk]) {
        if (this.#fileContentCache[kk].found) {
          return this.#fileContentCache[kk].content;
        }
        return undefined;
      }
      const url = this.url + "/" + path;
      let buf: ArrayBuffer | undefined;
      if (o.startByte !== undefined && o.endByte !== undefined) {
        buf = await fetchByteRange(
          url,
          o.startByte,
          o.endByte - o.startByte,
        );
      } else {
        const r = await fetch(url);
        if (!r.ok) {
          if (r.status === 404) {
            this.#fileContentCache[kk] = { content: undefined, found: false };
            return undefined; // file not found
          }
          throw Error(`Failed to fetch ${url}: ${r.statusText}`);
        }
        buf = await r.arrayBuffer();
      }
      if (o.decodeArray) {
        const parentPath = path.split("/").slice(0, -1).join("/");
        const zarray = (await this.readJson(parentPath + "/.zarray")) as
          | ZMetaDataZArray
          | undefined;
        if (!zarray) throw Error("Failed to read .zarray for " + path);
        try {
          buf = await zarrDecodeChunkArray(
            buf,
            zarray.dtype,
            zarray.compressor,
            zarray.filters,
            zarray.chunks,
          );
        } catch (e) {
          throw Error(`Failed to decode chunk array for ${path}: ${e}`);
        }
      }
      if (buf) {
        this.#fileContentCache[kk] = { content: buf, found: true };
      } else {
        this.#fileContentCache[kk] = { content: undefined, found: false };
      }
      return buf;
    } catch (e) {
      this.#fileContentCache[kk] = { content: undefined, found: false }; // important to do this so we don't keep trying to read the same file
      throw e;
    } finally {
      this.#inProgressReads[kk] = false;
    }
  }
}

class RemoteH5FileLindi {
  #cacheDisabled = false; // just for benchmarking
  #sourceUrls: string[] | undefined = undefined;
  constructor(
    public url: string,
    private lindiFileSystemClient: ReferenceFileSystemClient | ZarrFileSystemClient,
    private pathsByParentPath: { [key: string]: string[] },
  ) {}
  static async create(url: string) {
    const { rfs: obj, remoteTar } = await fetchRfsFromRemoteLindi(url);
    // console.info(`reference file system for ${url}`, obj);
    // console.info(`Meta only`, metaOnly(obj));
    const pathsByParentPath: { [key: string]: string[] } = {};
    for (const path in obj.refs) {
      if (path === ".zattrs" || path === ".zgroup") continue;
      const parts = path.split("/");
      if (parts.length <= 1) continue;
      const lastPart = parts[parts.length - 1];
      if (
        lastPart === ".zattrs" ||
        lastPart === ".zgroup" ||
        lastPart === ".zarray"
      ) {
        const thePath = parts.slice(0, parts.length - 1).join("/");
        const theParentPath = parts.slice(0, parts.length - 2).join("/");
        if (!pathsByParentPath[theParentPath])
          pathsByParentPath[theParentPath] = [];
        if (!pathsByParentPath[theParentPath].includes(thePath)) {
          pathsByParentPath[theParentPath].push(thePath);
        }
      }
    }
    return new RemoteH5FileLindi(
      url,
      new ReferenceFileSystemClient(obj, remoteTar),
      pathsByParentPath,
    );
  }
  static async createFromZarr(
    url: string,
  ) {
    const zarrFileSystemClient = new ZarrFileSystemClient(url);
    return new RemoteH5FileLindi(
      url,
      zarrFileSystemClient,
      {},
    )
  }
  get dataIsRemote() {
    return !this.url.startsWith("http://localhost");
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    if (path === "") path = "/";
    let group: RemoteH5Group | undefined;
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    let zgroup: ZMetaDataZGroup | undefined;
    let zattrs: ZMetaDataZAttrs | undefined;
    if (path === "/") {
      zgroup = (await this.lindiFileSystemClient.readJson(".zgroup")) as
        | ZMetaDataZGroup
        | undefined;
      zattrs = (await this.lindiFileSystemClient.readJson(".zattrs")) as
        | ZMetaDataZAttrs
        | undefined;
    } else {
      zgroup = (await this.lindiFileSystemClient.readJson(
        pathWithoutBeginningSlash + "/.zgroup",
      )) as ZMetaDataZGroup | undefined;
      zattrs = (await this.lindiFileSystemClient.readJson(
        pathWithoutBeginningSlash + "/.zattrs",
      )) as ZMetaDataZAttrs | undefined;
    }
    if (zgroup) {
      const subgroups: RemoteH5Subgroup[] = [];
      const subdatasets: RemoteH5Subdataset[] = [];
      const childPaths: string[] =
        this.pathsByParentPath[pathWithoutBeginningSlash] || [];
      for (const childPath of childPaths) {
        const childZgroup = await this.lindiFileSystemClient.readJson(
          childPath + "/.zgroup",
        );
        const childZarray = await this.lindiFileSystemClient.readJson(
          childPath + "/.zarray",
        );
        const childZattrs = await this.lindiFileSystemClient.readJson(
          childPath + "/.zattrs",
        );
        if (childZgroup) {
          subgroups.push({
            name: getNameFromPath(childPath),
            path: "/" + childPath,
            attrs: childZattrs || {},
          });
        } else if (childZarray) {
          const shape = childZarray.shape;
          const dtype = childZarray.dtype;
          if (shape && dtype) {
            subdatasets.push({
              name: getNameFromPath(childPath),
              path: "/" + childPath,
              shape,
              dtype,
              attrs: childZattrs || {},
            });
          } else {
            console.warn("Unexpected .zarray item", childPath, childZarray);
          }
        }
      }
      group = {
        path: path,
        subgroups,
        datasets: subdatasets,
        attrs: zattrs || {},
      };
    }
    globalRemoteH5FileStats.getGroupCount++;
    return group;
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    const zarray = (await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray",
    )) as ZMetaDataZArray;
    const zattrs = (await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zattrs",
    )) as ZMetaDataZAttrs;
    let dataset: RemoteH5Dataset | undefined;
    if (zarray) {
      dataset = {
        name: getNameFromPath(path),
        path,
        shape: zarray.shape || [],
        dtype: zarray.dtype || "",
        attrs: zattrs || {},
      };
    } else {
      dataset = undefined;
    }
    globalRemoteH5FileStats.getDatasetCount++;
    return dataset;
  }
  async getDatasetData(
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ): Promise<DatasetDataType | undefined> {
    // check for invalid slice
    if (o.slice) {
      for (const ss of o.slice) {
        if (isNaN(ss[0]) || isNaN(ss[1])) {
          console.warn("Invalid slice", path, o.slice);
          throw Error("Invalid slice");
        }
      }
    }
    if (o.slice && o.slice.length > 3) {
      console.warn(
        "Tried to slice more than three dimensions at a time",
        path,
        o.slice,
      );
      throw Error(
        `For now, you can't slice more than three dimensions at a time. You tried to slice ${o.slice.length} dimensions for ${path}.`,
      );
    }

    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    const zarray = (await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray",
    )) as ZMetaDataZArray | undefined;
    if (!zarray) {
      console.warn("No .zarray for", path);
      return undefined;
    }

    // const { slice, allowBigInt, canceler } = o;

    globalRemoteH5FileStats.getDatasetDataCount++;

    // old system (not used by lindi)
    const externalHdf5 = await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.external_hdf5",
    );
    if (externalHdf5) {
      throw Error("External hdf5 not supported on server side");
      // const a = await getRemoteH5File(externalHdf5.url);
      // return a.getDatasetData(externalHdf5.name, o);
    }

    const zattrs = (await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zattrs",
    )) as ZMetaDataZAttrs;
    if (zattrs && zattrs["_EXTERNAL_ARRAY_LINK"]) {
      throw Error("External array link not supported on server side");
      // const externalArrayLink = zattrs["_EXTERNAL_ARRAY_LINK"];
      // let url0 = externalArrayLink.url;
      // if (this.#cacheDisabled) {
      //   url0 += `?cacheBust=${Date.now()}`;
      // }
      // const a = await getRemoteH5File(url0);
      // return a.getDatasetData(externalArrayLink.name, o);
    }

    const ret = await lindiDatasetDataLoader({
      client: this.lindiFileSystemClient,
      path: pathWithoutBeginningSlash,
      zarray,
      slice: o.slice || [],
      disableCache: this.#cacheDisabled,
    });
    if (ret.length === 1) {
      // candidate for scalar, need to check for _SCALAR attribute
      const ds = await this.getDataset(path);
      if (ds && ds.attrs["_SCALAR"]) {
        return ret[0];
      }
    }
    return ret;
  }
  get _lindiFileSystemClient() {
    return this.lindiFileSystemClient;
  }
  async getLindiZarray(path: string): Promise<ZMetaDataZArray | undefined> {
    const pathWithoutBeginningSlash = path.startsWith("/")
      ? path.slice(1)
      : path;
    return (await this.lindiFileSystemClient.readJson(
      pathWithoutBeginningSlash + "/.zarray",
    )) as ZMetaDataZArray | undefined;
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
  _disableCache() {
    this.#cacheDisabled = true;
  }
}

const fetchRfsFromRemoteLindi = async (
  url: string,
): Promise<{
  rfs: ReferenceFileSystemObject;
  remoteTar: RemoteTarInterface | undefined;
}> => {
  const buf: ArrayBuffer = await fetchByteRange(url, 0, 512 * 3);
  if (isTarHeader(buf.slice(0, 512))) {
    const tarEntryBuf = buf.slice(512, 512 + 1024);
    const tarEntryJson = new TextDecoder().decode(tarEntryBuf);
    const tarEntry = JSON.parse(tarEntryJson);
    const indexInfo = tarEntry["index"];
    const entryDataStartByte = indexInfo["d"];
    const entryDataSize = indexInfo["s"];

    const indexBuf = await fetchByteRange(
      url,
      entryDataStartByte,
      entryDataSize,
    );
    const indexStr = new TextDecoder().decode(indexBuf);
    const index = JSON.parse(indexStr);
    const remoteTar: RemoteTarInterface = {
      url: url,
      getByteRangeForFile: async (fileName: string) => {
        const f = index.files.find((ff: any) => ff.n === fileName);
        if (!f) {
          throw Error(`File ${fileName} not found in tar`);
        }
        return {
          startByte: f.d as number,
          endByte: (f.d + f.s) as number,
        };
      },
    };
    const { startByte: rfsStartByte, endByte: rfsEndByte } =
      await remoteTar.getByteRangeForFile("lindi.json");
    const rfsBuf = await fetchByteRange(
      url,
      rfsStartByte,
      rfsEndByte - rfsStartByte,
    );
    const rfs = JSON.parse(new TextDecoder().decode(rfsBuf));
    if (!isReferenceFileSystemObject(rfs)) {
      console.warn(rfs);
      throw Error("Invalid rfs from tar");
    }
    return {
      rfs,
      remoteTar,
    };
  } else {
    const r = await fetch(url);
    if (!r.ok) throw Error("Failed to fetch LINDI file" + url);
    const rfs = await r.json();
    if (!isReferenceFileSystemObject(rfs)) {
      console.warn(rfs);
      throw Error("Invalid rfs");
    }
    return {
      rfs,
      remoteTar: undefined,
    };
  }
};

const fetchByteRange = async (url: string, startByte: number, size: number) => {
  const r = await fetch(url, {
    headers: {
      Range: `bytes=${startByte}-${startByte + size - 1}`,
    },
  });
  if (!r.ok)
    throw Error(
      `Failed to fetch byte range ${startByte}-${startByte + size - 1} of ${url}`,
    );
  return await r.arrayBuffer();
};

const isTarHeader = (buf: ArrayBuffer) => {
  if (buf.byteLength < 512) {
    return false;
  }

  // We're only going to support ustar format
  // get the ustar indicator at bytes 257-262
  const ustarIndicator = buf.slice(257, 262);
  const ustarIndicatorStr = new TextDecoder().decode(
    ustarIndicator.slice(0, 5),
  );
  const bb = new Uint8Array(buf);
  if (ustarIndicatorStr === "ustar" && bb[257 + 5] == 0) {
    return true;
  }

  // Check for any 0 bytes in the header
  const bb2 = new Uint8Array(buf);
  if (bb2.includes(0)) {
    console.warn(ustarIndicatorStr);
    throw Error(
      "Problem with lindi file: 0 byte found in header, but not ustar tar format",
    );
  }

  return false;
};

const getNameFromPath = (path: string) => {
  const parts = path.split("/");
  if (parts.length === 0) return "";
  return parts[parts.length - 1];
};

const lock1: { locked: boolean } = { locked: false };
const globalLindiRemoteH5Files: { [url: string]: RemoteH5FileLindi } = {};
export const getRemoteH5FileLindi = async (url: string) => {
  while (lock1.locked) await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    lock1.locked = true;
    const kk = url;
    if (!globalLindiRemoteH5Files[kk]) {
      globalLindiRemoteH5Files[kk] = await RemoteH5FileLindi.create(url);
    }
    return globalLindiRemoteH5Files[kk];
  } finally {
    lock1.locked = false;
  }
};

// const metaOnly = (obj: ReferenceFileSystemObject) => {
//   const ret = {
//     refs: {} as any,
//     version: obj.version,
//   };
//   for (const k in obj.refs) {
//     if (
//       k.endsWith(".zattrs") ||
//       k.endsWith(".zgroup") ||
//       k.endsWith(".zarray")
//     ) {
//       ret.refs[k] = obj.refs[k];
//     }
//   }
//   return ret;
// };

export default RemoteH5FileLindi;
