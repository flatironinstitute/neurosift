import { postRemoteH5WorkerRequest } from "./helpers"

export type RemoteH5Group = {
  name: string
  path: string
  groups: RemoteH5Group[]
  datasets: RemoteH5Dataset[]
}

export type RemoteH5Dataset = {
  name: string
  path: string
  shape: number[]
  dtype: string
}

export type DatasetDataType = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array | Uint8Array | Uint16Array | Uint32Array

export class RemoteH5File {
  #initialized = false
  #initializing = false
  #groupCache: { [path: string]: RemoteH5Group } = {}
  #datasetCache: { [path: string]: RemoteH5Dataset } = {}
  constructor(private url: string) {

  }
  async initialize() {
    if (this.#initialized) return
    if (this.#initializing) {
      while (!this.#initialized) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      return
    }
    this.#initializing = true
    await postRemoteH5WorkerRequest({
      type: 'initialize',
      url: this.url
    })
    this.#initializing = false
    this.#initialized = true
  }
  async getGroup(path: string): Promise<RemoteH5Group> {
    if (this.#groupCache[path]) return this.#groupCache[path]
    const resp = await postRemoteH5WorkerRequest({
      type: 'getGroup',
      url: this.url,
      path,
    })
    this.#groupCache[path] = resp.group
    return this.#groupCache[path]
  }
  async getDataset(path: string): Promise<RemoteH5Dataset> {
    if (this.#datasetCache[path]) return this.#datasetCache[path]
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDataset',
      url: this.url,
      path,
    })
    this.#datasetCache[path] = resp.dataset
    return this.#datasetCache[path]
  }
  async getDatasetData(path: string, o: { slice?: [number, number][], allowBigInt?: boolean }): Promise<DatasetDataType> {
    const { slice, allowBigInt } = o
    const resp = await postRemoteH5WorkerRequest({
      type: 'getDatasetData',
      url: this.url,
      path,
      slice
    })
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
export const getRemoteH5File = async (url: string) => {
  if (!globalRemoteH5Files[url]) {
    globalRemoteH5Files[url] = new RemoteH5File(url)
  }
  await globalRemoteH5Files[url].initialize()
  return globalRemoteH5Files[url]
}