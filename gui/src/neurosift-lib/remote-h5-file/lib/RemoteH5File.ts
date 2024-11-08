/* eslint-disable @typescript-eslint/no-explicit-any */
import { Canceler, postRemoteH5WorkerRequest } from "./helpers";
import RemoteH5FileLindi, {
  getRemoteH5FileLindi,
} from "./lindi/RemoteH5FileLindi";

export type RemoteH5FileX =
  | RemoteH5File
  | MergedRemoteH5File
  | RemoteH5FileLindi;

export type RemoteH5Group = {
  path: string;
  subgroups: RemoteH5Subgroup[];
  datasets: RemoteH5Subdataset[];
  attrs: { [key: string]: any };
};

export type RemoteH5Subgroup = {
  name: string;
  path: string;
  attrs: { [key: string]: any };
};

export type RemoteH5Subdataset = {
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

export type RemoteH5Dataset = {
  name: string;
  path: string;
  shape: number[];
  dtype: string;
  attrs: { [key: string]: any };
};

export type DatasetDataType =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;

const defaultChunkSize = 1024 * 100;
// const defaultChunkSize = 1024 * 1024 * 2

export const globalRemoteH5FileStats = {
  getGroupCount: 0,
  getDatasetCount: 0,
  getDatasetDataCount: 0,
  numPendingRequests: 0,
};

type GetGroupResponse = {
  success: boolean;
  group?: RemoteH5Group;
};

type GetDatasetResponse = {
  success: boolean;
  dataset?: RemoteH5Dataset;
};

export class RemoteH5File {
  #groupCache: { [path: string]: GetGroupResponse | null } = {}; // null means in progress
  #datasetCache: { [path: string]: GetDatasetResponse | null } = {}; // null means in progress
  #sourceUrls: string[] | undefined = undefined;
  constructor(
    public url: string,
    private o: { chunkSize?: number },
  ) {}
  get dataIsRemote() {
    return !this.url.startsWith("http://localhost");
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    const cc = this.#groupCache[path];
    if (cc) return cc.group;
    if (cc === null) {
      // in progress
      while (this.#groupCache[path] === null) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const cc2 = this.#groupCache[path];
      if (cc2) return cc2.group;
      else throw Error("Unexpected");
    }
    this.#groupCache[path] = null;
    const dummyCanceler = { onCancel: [] };
    let resp;
    try {
      resp = await postRemoteH5WorkerRequest(
        {
          type: "getGroup",
          url: this.url,
          path,
          chunkSize: this.o.chunkSize || defaultChunkSize,
        },
        dummyCanceler,
      );
    } catch {
      this.#groupCache[path] = { success: false };
      return undefined;
    }
    this.#groupCache[path] = resp;
    globalRemoteH5FileStats.getGroupCount++;
    return resp.group;
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    const cc = this.#datasetCache[path];
    if (cc) return cc.dataset;
    if (cc === null) {
      // in progress
      while (this.#datasetCache[path] === null) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      const cc2 = this.#datasetCache[path];
      if (cc2) return cc2.dataset;
      else throw Error("Unexpected");
    }
    this.#datasetCache[path] = null;
    const dummyCanceler = { onCancel: [] };
    let resp;
    try {
      resp = await postRemoteH5WorkerRequest(
        {
          type: "getDataset",
          url: this.url,
          path,
          chunkSize: this.o.chunkSize || defaultChunkSize,
        },
        dummyCanceler,
      );
    } catch (e) {
      this.#datasetCache[path] = { success: false };
      return undefined;
    }
    this.#datasetCache[path] = resp;
    globalRemoteH5FileStats.getDatasetCount++;
    return resp.dataset;
  }
  async getDatasetData(
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ): Promise<DatasetDataType | undefined> {
    if (o.slice) {
      for (const ss of o.slice) {
        if (isNaN(ss[0]) || isNaN(ss[1])) {
          console.warn("Invalid slice", path, o.slice);
          throw Error("Invalid slice");
        }
      }
    }
    const ds = await this.getDataset(path);
    if (!ds) return undefined;
    let urlToUse: string = this.url;
    if (product(ds.shape) > 100) {
      urlToUse = this.url;
    }

    const { slice, allowBigInt, canceler } = o;
    const dummyCanceler = { onCancel: [] };
    let resp;
    try {
      resp = await postRemoteH5WorkerRequest(
        {
          type: "getDatasetData",
          url: urlToUse,
          path,
          slice,
          chunkSize: this.o.chunkSize || defaultChunkSize,
        },
        canceler || dummyCanceler,
      );
    } catch {
      return undefined;
    }
    const { data } = resp;
    let x = data;
    if (!allowBigInt) {
      // check if x is a BigInt64Array
      if (x && x.constructor && x.constructor.name === "BigInt64Array") {
        // convert to Int32Array
        const y = new Int32Array(x.length);
        for (let i = 0; i < x.length; i++) {
          y[i] = Number(x[i]);
        }
        x = y;
      }
      // check if x is a BigUint64Array
      if (x && x.constructor && x.constructor.name === "BigUint64Array") {
        // convert to Uint32Array
        const y = new Uint32Array(x.length);
        for (let i = 0; i < x.length; i++) {
          y[i] = Number(x[i]);
        }
        x = y;
      }
    }
    globalRemoteH5FileStats.getDatasetDataCount++;
    return x;
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

export class MergedRemoteH5File {
  #files: RemoteH5FileX[];
  #sourceUrls: string[] | undefined = undefined;
  constructor(files: RemoteH5FileX[]) {
    this.#files = files;
  }
  get dataIsRemote() {
    return this.#files.some((f) => {
      if (f instanceof RemoteH5File) {
        return f.dataIsRemote;
      } else if (f instanceof MergedRemoteH5File) {
        // this case shouldn't happen - unfortunately we can't call f.dataIsRemote here because typescript doesn't allow it
        return false;
      } else {
        throw Error("Unexpected");
      }
    });
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    const allGroups: RemoteH5Group[] = [];
    for (const f of this.#files) {
      const gg = await f.getGroup(path);
      if (gg) allGroups.push(gg);
    }
    console.log(`Got ${allGroups.length} groups`, path);
    if (allGroups.length === 0) return undefined;
    const ret = mergeGroups(allGroups);
    return ret;
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    for (const f of this.#files) {
      const dd = await f.getDataset(path);
      if (dd) {
        // just return the first one
        return dd;
      }
    }
    return undefined;
  }
  async getDatasetData(
    path: string,
    o: {
      slice?: [number, number][];
      allowBigInt?: boolean;
      canceler?: Canceler;
    },
  ): Promise<DatasetDataType | undefined> {
    let canceled = false;
    o.canceler?.onCancel.push(() => {
      canceled = true;
    });
    for (const f of this.#files) {
      const dd = await f.getDatasetData(path, o);
      if (dd) {
        // just return the first one
        return dd;
      }
      if (canceled) return undefined;
    }
    return undefined;
  }
  getFiles() {
    return this.#files;
  }
  getUrls(): string[] {
    return this.#files.flatMap((f) => f.getUrls());
  }
  get sourceUrls(): string[] | undefined {
    return this.#sourceUrls;
  }
  set sourceUrls(v: string[] | undefined) {
    this.#sourceUrls = v;
  }
}

const mergeGroups = (groups: RemoteH5Group[]): RemoteH5Group => {
  if (groups.length === 0) throw Error("Unexpected groups.length == 0");
  const ret: RemoteH5Group = {
    path: groups[0].path,
    subgroups: [],
    datasets: [],
    attrs: {},
  };
  const allSubgroupNames: string[] = [];
  const allDatasetNames: string[] = [];
  for (const g of groups) {
    for (const sg of g.subgroups) {
      if (!allSubgroupNames.includes(sg.name)) {
        allSubgroupNames.push(sg.name);
      }
    }
    for (const ds of g.datasets) {
      if (!allDatasetNames.includes(ds.name)) {
        allDatasetNames.push(ds.name);
      }
    }
  }
  for (const sgName of allSubgroupNames) {
    const subgroups: RemoteH5Subgroup[] = [];
    for (const g of groups) {
      const sg = g.subgroups.find((s) => s.name === sgName);
      if (sg) subgroups.push(sg);
    }
    ret.subgroups.push(mergeSubgroups(subgroups));
  }
  for (const dsName of allDatasetNames) {
    const datasets: RemoteH5Subdataset[] = [];
    for (const g of groups) {
      const ds = g.datasets.find((d) => d.name === dsName);
      if (ds) datasets.push(ds);
    }
    // for the datasets we just use the first one
    if (datasets.length > 0) {
      ret.datasets.push(datasets[0]);
    }
  }
  for (const g of groups) {
    for (const key in g.attrs) {
      if (!(key in ret.attrs)) {
        // the first takes precedence
        ret.attrs[key] = g.attrs[key];
      }
    }
  }
  return ret;
};

const mergeSubgroups = (subgroups: RemoteH5Subgroup[]): RemoteH5Subgroup => {
  if (subgroups.length === 0) throw Error("Unexpected subgroups.length == 0");
  const ret: RemoteH5Subgroup = {
    name: subgroups[0].name,
    path: subgroups[0].path,
    attrs: {},
  };
  for (const g of subgroups) {
    for (const key in g.attrs) {
      if (!(key in ret.attrs)) {
        // the first takes precedence
        ret.attrs[key] = g.attrs[key];
      }
    }
  }
  return ret;
};

const globalRemoteH5Files: { [url: string]: RemoteH5File } = {};
export const getRemoteH5File = async (url: string) => {
  const kk = url;
  if (!globalRemoteH5Files[kk]) {
    globalRemoteH5Files[kk] = new RemoteH5File(url, {});
  }
  return globalRemoteH5Files[kk];
};

const globalMergedRemoteH5Files: { [kk: string]: MergedRemoteH5File } = {};
export const getMergedRemoteH5File = async (
  urls: string[],
  storageType: ("h5" | "zarr" | "lindi")[],
) => {
  if (urls.length === 0) throw Error(`Length of urls must be > 0`);
  if (storageType.length !== urls.length)
    throw Error(`Length of storageType must be equal to length of urls`);
  if (urls.length === 1) {
    if (storageType[0] === "lindi") {
      return await getRemoteH5FileLindi(urls[0]);
    } else {
      return await getRemoteH5File(urls[0]);
    }
  }
  const kk = urls.join("|");
  if (!globalMergedRemoteH5Files[kk]) {
    const files = await Promise.all(
      urls.map((url, i) => {
        if (storageType[i] === "lindi") {
          return getRemoteH5FileLindi(url);
        } else {
          return getRemoteH5File(url);
        }
      }),
    );
    globalMergedRemoteH5Files[kk] = new MergedRemoteH5File(files);
  }
  return globalMergedRemoteH5Files[kk];
};

const product = (x: number[]) => {
  let p = 1;
  for (let i = 0; i < x.length; i++) p *= x[i];
  return p;
};
