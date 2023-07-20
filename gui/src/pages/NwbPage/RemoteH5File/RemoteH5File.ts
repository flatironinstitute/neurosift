import { Canceler, postRemoteH5WorkerRequest } from "./helpers"

export type RemoteH5Group = {
  path: string
  subgroups: RemoteH5Subgroup[]
  datasets: RemoteH5Subdataset[]
  attrs: { [key: string]: any }
}

export type RemoteH5Subgroup = {
  name: string
  path: string
  attrs: { [key: string]: any }
}

export type RemoteH5Subdataset = {
  name: string
  path: string
  shape: number[]
  dtype: string
  attrs: { [key: string]: any }
}

export type RemoteH5Dataset = {
  name: string
  path: string
  shape: number[]
  dtype: string
  attrs: { [key: string]: any }
}

export type DatasetDataType = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array

const chunkSizeForMetaFile = 1024 * 1024 * 4
const defaultChunkSize = 1024 * 30

export const globalRemoteH5FileStats = {
  getGroupCount: 0,
  getDatasetCount: 0,
  getDatasetDataCount: 0
}


export class RemoteH5File {
  #groupCache: { [path: string]: RemoteH5Group } = {}
  #datasetCache: { [path: string]: RemoteH5Dataset } = {}
  constructor(public url: string, private metaUrl: string | undefined) {

  }
  async getGroup(path: string): Promise<RemoteH5Group> {
    if (this.#groupCache[path]) return this.#groupCache[path]
    const dummyCanceler = {onCancel: []}
    const resp = await postRemoteH5WorkerRequest({
      type: 'getGroup',
      url: this.metaUrl || this.url,
      path,
      chunkSize: this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize
    }, dummyCanceler)
    this.#groupCache[path] = resp.group
    globalRemoteH5FileStats.getGroupCount ++
    return this.#groupCache[path]
  }
  async getDataset(path: string): Promise<RemoteH5Dataset> {
    if (this.#datasetCache[path]) return this.#datasetCache[path]
    const dummyCanceler = {onCancel: []}
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDataset',
      url: this.metaUrl || this.url,
      path,
      chunkSize: this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize
    }, dummyCanceler)
    this.#datasetCache[path] = resp.dataset
    globalRemoteH5FileStats.getDatasetCount ++
    return this.#datasetCache[path]
  }
  async getDatasetData(path: string, o: { slice?: [number, number][], allowBigInt?: boolean, canceler?: Canceler}): Promise<DatasetDataType> {
    const ds = await this.getDataset(path)
    let urlToUse: string = this.metaUrl || this.url
    if (product(ds.shape) > 100) {
      urlToUse = this.url
    }

    const { slice, allowBigInt, canceler } = o
    const dummyCanceler = {onCancel: []}
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDatasetData',
      url: urlToUse,
      path,
      slice,
      chunkSize: urlToUse === this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize,
    }, canceler || dummyCanceler)
    const { data } = resp
    let x = data
    if (!allowBigInt) {
      // check if x is a BigInt64Array
      if (x && x.constructor && x.constructor.name === 'BigInt64Array') {
        // convert to Int32Array
        const y = new Int32Array(x.length)
        for (let i = 0; i < x.length; i++) {
          y[i] = Number(x[i])
        }
        x = y
      }
      // check if x is a BigUint64Array
      if (x && x.constructor && x.constructor.name === 'BigUint64Array') {
        // convert to Uint32Array
        const y = new Uint32Array(x.length)
        for (let i = 0; i < x.length; i++) {
          y[i] = Number(x[i])
        }
        x = y
      }
    }
    globalRemoteH5FileStats.getDatasetDataCount ++
    return x
  }
}
const globalRemoteH5Files: { [url: string]: RemoteH5File } = {}
export const getRemoteH5File = async (url: string, metaUrl: string | undefined) => {
  const kk = url + '|' + metaUrl
  if (!globalRemoteH5Files[kk]) {
    globalRemoteH5Files[kk] = new RemoteH5File(url, metaUrl)
  }
  return globalRemoteH5Files[kk]
}

const product = (x: number[]) => {
  let p = 1
  for (let i = 0; i < x.length; i++) p *= x[i]
  return p
}