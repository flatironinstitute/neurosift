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

export class RemoteH5File {
  #groupCache: { [path: string]: RemoteH5Group } = {}
  #datasetCache: { [path: string]: RemoteH5Dataset } = {}
  constructor(private url: string, private metaUrl: string | undefined) {

  }
  async getGroup(path: string): Promise<RemoteH5Group> {
    if (this.#groupCache[path]) return this.#groupCache[path]
    const dummyCanceler = {onCancel: []}
    const resp = await postRemoteH5WorkerRequest({
      type: 'getGroup',
      url: this.metaUrl || this.url,
      path,
    }, dummyCanceler)
    this.#groupCache[path] = resp.group
    return this.#groupCache[path]
  }
  async getDataset(path: string): Promise<RemoteH5Dataset> {
    if (this.#datasetCache[path]) return this.#datasetCache[path]
    const dummyCanceler = {onCancel: []}
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDataset',
      url: this.metaUrl || this.url,
      path,
    }, dummyCanceler)
    this.#datasetCache[path] = resp.dataset
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
    // const chunkMode = slice ? (
    //   product(slice.map(s => s[1] - s[0])) >= 1e5 ? 'large-chunks' : 'small-chunks'
    // ) : 'small-chunks'
    const chunkMode = 'small-chunks' // for now only do small chunks until we can figure out a better way
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDatasetData',
      url: urlToUse,
      path,
      slice,
      chunkMode
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