/* eslint-disable @typescript-eslint/no-explicit-any */
import { DatasetDataType, RemoteH5Dataset, RemoteH5Group, RemoteH5Subdataset, RemoteH5Subgroup, getRemoteH5File, globalRemoteH5FileStats } from '../RemoteH5File';
import { Canceler } from '../helpers';

import ReferenceFileSystemClient, { ReferenceFileSystemObject } from './ReferenceFileSystemClient';
import lindiDatasetDataLoader from './lindiDatasetDataLoader';

type ZMetaDataZAttrs = {[key: string]: any}

type ZMetaDataZGroup = {
    zarr_format: number
}

export type ZMetaDataZArray = {
    chunks?: number[]
    compressor?: any
    dtype?: string
    fill_value?: any
    filters?: any[]
    order?: 'C' | 'F'
    shape?: number[]
    zarr_format?: 2
}

class RemoteH5FileLindi {
  #cacheDisabled = false // just for benchmarking
  constructor(public url: string, private lindiFileSystemClient: ReferenceFileSystemClient, private pathsByParentPath: {[key: string]: string[]}) {

  }
  static async create(url: string) {
    const r = await fetch(url);
    if (!r.ok) throw Error('Failed to fetch LINDI file' + url);
    const obj: ReferenceFileSystemObject = await r.json();
    console.info(`reference file system for ${url}`, obj);
    console.info(`Meta only`, metaOnly(obj));
    const pathsByParentPath: {[key: string]: string[]} = {};
    for (const path in obj.refs) {
      if (path === '.zattrs' || path === '.zgroup') continue;
      const parts = path.split('/');
      if (parts.length <= 1) continue;
      const lastPart = parts[parts.length - 1];
      if ((lastPart === '.zattrs') || (lastPart === '.zgroup') || (lastPart === '.zarray')) {
        const thePath = parts.slice(0, parts.length - 1).join('/');
        const theParentPath = parts.slice(0, parts.length - 2).join('/');
        if (!pathsByParentPath[theParentPath]) pathsByParentPath[theParentPath] = [];
        if (!pathsByParentPath[theParentPath].includes(thePath)) {
          pathsByParentPath[theParentPath].push(thePath);
        }
      }
    }
    return new RemoteH5FileLindi(url, new ReferenceFileSystemClient(obj), pathsByParentPath);
  }
  get dataIsRemote() {
    return !this.url.startsWith('http://localhost');
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    if (path === '') path = '/';
    let group: RemoteH5Group | undefined;
    const pathWithoutBeginningSlash = path.startsWith('/') ? path.slice(1) : path;
    let zgroup: ZMetaDataZGroup | undefined
    let zattrs: ZMetaDataZAttrs | undefined
    if (path === '/') {
      zgroup = (await this.lindiFileSystemClient.readJson('.zgroup')) as ZMetaDataZGroup | undefined
      zattrs = (await this.lindiFileSystemClient.readJson('.zattrs')) as ZMetaDataZAttrs | undefined
    }
    else {
      zgroup = (await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zgroup')) as ZMetaDataZGroup | undefined
      zattrs = (await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zattrs')) as ZMetaDataZAttrs | undefined
    }
    if (zgroup) {
      const subgroups: RemoteH5Subgroup[] = [];
      const subdatasets: RemoteH5Subdataset[] = [];
      const childPaths: string[] = this.pathsByParentPath[pathWithoutBeginningSlash] || [];
      for (const childPath of childPaths) {
        const childZgroup = await this.lindiFileSystemClient.readJson(childPath + '/.zgroup');
        const childZarray = await this.lindiFileSystemClient.readJson(childPath + '/.zarray');
        const childZattrs = await this.lindiFileSystemClient.readJson(childPath + '/.zattrs');
        if (childZgroup) {
          subgroups.push({
            name: getNameFromPath(childPath),
            path: '/' + childPath,
            attrs: childZattrs || {}
          });
        }
        else if (childZarray) {
          const shape = childZarray.shape;
          const dtype = childZarray.dtype;
          if (shape && dtype) {
            subdatasets.push({
              name: getNameFromPath(childPath),
              path: '/' + childPath,
              shape,
              dtype,
              attrs: childZattrs || {}
            });
          }
          else {
            console.warn('Unexpected .zarray item', childPath, childZarray);
          }
        }
      }
      group = {
          path: path,
          subgroups,
          datasets: subdatasets,
          attrs: zattrs || {}
      }
    }
    globalRemoteH5FileStats.getGroupCount++;
    return group;
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    const pathWithoutBeginningSlash = path.startsWith('/') ? path.slice(1) : path;
    const zarray = await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zarray') as ZMetaDataZArray;
    const zattrs = await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zattrs') as ZMetaDataZAttrs;
    let dataset: RemoteH5Dataset | undefined;
    if (zarray) {
      dataset = {
        name: getNameFromPath(path),
        path,
        shape: zarray.shape || [],
        dtype: zarray.dtype || '',
        attrs: zattrs || {}
      }
    }
    else {
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
    }
  ): Promise<DatasetDataType | undefined> {
    // check for invalid slice
    if (o.slice) {
      for (const ss of o.slice) {
        if (isNaN(ss[0]) || isNaN(ss[1])) {
          console.warn('Invalid slice', path, o.slice);
          throw Error('Invalid slice');
        }
      }
    }
    if ((o.slice) && (o.slice.length > 3)) {
      console.warn('Tried to slice more than three dimensions at a time', path, o.slice);
      throw Error(`For now, you can't slice more than three dimensions at a time. You tried to slice ${o.slice.length} dimensions for ${path}.`);
    }

    const pathWithoutBeginningSlash = path.startsWith('/') ? path.slice(1) : path;
    const zarray = await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zarray') as ZMetaDataZArray | undefined;
    if (!zarray) {
      console.warn('No .zarray for', path);
      return undefined;
    }

    // const { slice, allowBigInt, canceler } = o;

    globalRemoteH5FileStats.getDatasetDataCount++;

    // old system (not used by lindi)
    const externalHdf5 = await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.external_hdf5')
    if (externalHdf5) {
      const a = await getRemoteH5File(externalHdf5.url);
      return a.getDatasetData(externalHdf5.name, o);
    }

    const zattrs = await this.lindiFileSystemClient.readJson(pathWithoutBeginningSlash + '/.zattrs') as ZMetaDataZAttrs;
    if (zattrs && zattrs['_EXTERNAL_ARRAY_LINK']) {
      const externalArrayLink = zattrs['_EXTERNAL_ARRAY_LINK'];
      let url0 = externalArrayLink.url;
      if (this.#cacheDisabled) {
        url0 += `?cacheBust=${Date.now()}`;
      }
      const a = await getRemoteH5File(url0);
      return a.getDatasetData(externalArrayLink.name, o);
    }

    const ret = await lindiDatasetDataLoader({
      client: this.lindiFileSystemClient,
      path: pathWithoutBeginningSlash,
      zarray,
      slice: o.slice || [],
      disableCache: this.#cacheDisabled
    })
    if (ret.length === 1) {
      // candidate for scalar, need to check for _SCALAR attribute
      const ds = await this.getDataset(path);
      if (ds && ds.attrs['_SCALAR']) {
        return ret[0];
      }
    }
    return ret
  }
  get _lindiFileSystemClient() {
    return this.lindiFileSystemClient;
  }
  async getLindiZarray(path: string): Promise<ZMetaDataZArray | undefined> {
    const pathWithoutBeginningSlash = path.startsWith('/') ? path.slice(1) : path;
    return await this.lindiFileSystemClient
      .readJson(pathWithoutBeginningSlash + '/.zarray') as ZMetaDataZArray | undefined;
  }
  getUrls() {
    return [this.url];
  }
  _disableCache() {
    this.#cacheDisabled = true;
  }
}

const getNameFromPath = (path: string) => {
    const parts = path.split('/');
    if (parts.length === 0) return '';
    return parts[parts.length - 1];
}

const lock1: {locked: boolean} = {locked: false};
const globalLindiRemoteH5Files: { [url: string]: RemoteH5FileLindi } = {};
export const getRemoteH5FileLindi = async (url: string) => {
  while (lock1.locked) await new Promise(resolve => setTimeout(resolve, 100));
  try {
    lock1.locked = true;
    const kk = url;
    if (!globalLindiRemoteH5Files[kk]) {
      globalLindiRemoteH5Files[kk] = await RemoteH5FileLindi.create(url);
    }
    return globalLindiRemoteH5Files[kk];
  }
  finally {
    lock1.locked = false;
  }
};

const metaOnly = (obj: ReferenceFileSystemObject) => {
  const ret = {
    refs: {} as any,
    version: obj.version
  };
  for (const k in obj.refs) {
    if (k.endsWith('.zattrs') || k.endsWith('.zgroup') || k.endsWith('.zarray')) {
      ret.refs[k] = obj.refs[k];
    }
  }
  return ret;
}

export default RemoteH5FileLindi;
