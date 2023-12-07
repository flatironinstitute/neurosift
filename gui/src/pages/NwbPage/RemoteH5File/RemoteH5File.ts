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
const defaultChunkSize = 1024 * 100
// const defaultChunkSize = 1024 * 1024 * 2

export const globalRemoteH5FileStats = {
  getGroupCount: 0,
  getDatasetCount: 0,
  getDatasetDataCount: 0,
  numPendingRequests: 0
}

type GetGroupResponse = {
  success: boolean
  group?: RemoteH5Group
}

type GetDatasetResponse = {
  success: boolean
  dataset?: RemoteH5Dataset
}


export class RemoteH5File {
  #groupCache: { [path: string]: GetGroupResponse | null } = {} // null means in progress
  #datasetCache: { [path: string]: GetDatasetResponse | null } = {} // null means in progress
  constructor(public url: string, private metaUrl: string | undefined) {

  }
  get dataIsRemote() {
    return !this.url.startsWith('http://localhost')
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    const cc = this.#groupCache[path]
    if (cc) return cc.group
    if (cc === null) {
      // in progress
      while (this.#groupCache[path] === null) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      const cc2 = this.#groupCache[path]
      if (cc2) return cc2.group
      else throw Error('Unexpected')
    }
    this.#groupCache[path] = null
    const dummyCanceler = {onCancel: []}
    let resp
    try {
      resp = await postRemoteH5WorkerRequest({
        type: 'getGroup',
        url: this.metaUrl || this.url,
        path,
        chunkSize: this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize
      }, dummyCanceler)
    }
    catch {
      this.#groupCache[path] = {success: false}
      return undefined
    }
    this.#groupCache[path] = resp
    globalRemoteH5FileStats.getGroupCount ++
    return resp.group
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    const cc = this.#datasetCache[path]
    if (cc) return cc.dataset
    if (cc === null) {
      // in progress
      while (this.#datasetCache[path] === null) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      const cc2 = this.#datasetCache[path]
      if (cc2) return cc2.dataset
      else throw Error('Unexpected')
    }
    this.#datasetCache[path] = null
    const dummyCanceler = {onCancel: []}
    let resp
    try {
      resp = await postRemoteH5WorkerRequest({
        type: 'getDataset',
        url: this.metaUrl || this.url,
        path,
        chunkSize: this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize
      }, dummyCanceler)
    }
    catch (e) {
      this.#datasetCache[path] = {success: false}
      return undefined
    }
    this.#datasetCache[path] = resp
    globalRemoteH5FileStats.getDatasetCount ++
    return resp.dataset
  }
  async getDatasetData(path: string, o: { slice?: [number, number][], allowBigInt?: boolean, canceler?: Canceler}): Promise<DatasetDataType | undefined> {
    if (o.slice) {
      for (const ss of o.slice) {
        if (isNaN(ss[0]) || isNaN(ss[1])) {
          console.warn('Invalid slice', path, o.slice)
          throw Error('Invalid slice')
        }
      }
    }
    const ds = await this.getDataset(path)
    if (!ds) return undefined
    let urlToUse: string = this.metaUrl || this.url
    if (product(ds.shape) > 100) {
      urlToUse = this.url
    }

    const { slice, allowBigInt, canceler } = o
    const dummyCanceler = {onCancel: []}
    let resp
    try {
      resp = await postRemoteH5WorkerRequest({
        type: 'getDatasetData',
        url: urlToUse,
        path,
        slice,
        chunkSize: urlToUse === this.metaUrl ? chunkSizeForMetaFile : defaultChunkSize,
      }, canceler || dummyCanceler)
    }
    catch {
      return undefined
    }
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

export class MergedRemoteH5File {
  #files: RemoteH5File[]
  constructor(files: (RemoteH5File)[]) {
    this.#files = files
  }
  get dataIsRemote() {
    return this.#files.some(f => f.dataIsRemote)
  }
  async getGroup(path: string): Promise<RemoteH5Group | undefined> {
    const allGroups: RemoteH5Group[] = []
    for (const f of this.#files) {
      const gg = await f.getGroup(path)
      if (gg) allGroups.push(gg)
    }
    console.log(`Got ${allGroups.length} groups`, path)
    if (allGroups.length === 0) return undefined
    const ret = mergeGroups(allGroups)
    return ret
  }
  async getDataset(path: string): Promise<RemoteH5Dataset | undefined> {
    for (const f of this.#files) {
      const dd = await f.getDataset(path)
      if (dd) {
        // just return the first one
        return dd
      }
    }
    return undefined
  }
  async getDatasetData(path: string, o: { slice?: [number, number][], allowBigInt?: boolean, canceler?: Canceler}): Promise<DatasetDataType | undefined> {
    let canceled = false
    o.canceler?.onCancel.push(() => {
      canceled = true
    })
    for (const f of this.#files) {
      const dd = await f.getDatasetData(path, o)
      if (dd) {
        // just return the first one
        return dd
      }
      if (canceled) return undefined
    }
    return undefined
  }
  getFiles() {
    return this.#files
  }
}

const mergeGroups = (groups: RemoteH5Group[]): RemoteH5Group => {
  if (groups.length === 0) throw Error('Unexpected groups.length == 0')
  const ret: RemoteH5Group = {
    path: groups[0].path,
    subgroups: [],
    datasets: [],
    attrs: {}
  }
  const allSubgroupNames: string[] = []
  const allDatasetNames: string[] = []
  for (const g of groups) {
    for (const sg of g.subgroups) {
      if (!allSubgroupNames.includes(sg.name)) {
        allSubgroupNames.push(sg.name)
      }
    }
    for (const ds of g.datasets) {
      if (!allDatasetNames.includes(ds.name)) {
        allDatasetNames.push(ds.name)
      }
    }
  }
  for (const sgName of allSubgroupNames) {
    const subgroups: RemoteH5Subgroup[] = []
    for (const g of groups) {
      const sg = g.subgroups.find(s => (s.name === sgName))
      if (sg) subgroups.push(sg)
    }
    ret.subgroups.push(mergeSubgroups(subgroups))
  }
  for (const dsName of allDatasetNames) {
    const datasets: RemoteH5Subdataset[] = []
    for (const g of groups) {
      const ds = g.datasets.find(d => (d.name === dsName))
      if (ds) datasets.push(ds)
    }
    // for the datasets we just use the first one
    if (datasets.length > 0) {
      ret.datasets.push(datasets[0])
    }
  }
  for (const g of groups) {
    for (const key in g.attrs) {
      if (!(key in ret.attrs)) {
        // the first takes precedence
        ret.attrs[key] = g.attrs[key]
      }
    }
  }
  return ret
}

const mergeSubgroups = (subgroups: RemoteH5Subgroup[]): RemoteH5Subgroup => {
  if (subgroups.length === 0) throw Error('Unexpected subgroups.length == 0')
  const ret: RemoteH5Subgroup = {
    name: subgroups[0].name,
    path: subgroups[0].path,
    attrs: {}
  }
  for (const g of subgroups) {
    for (const key in g.attrs) {
      if (!(key in ret.attrs)) {
        // the first takes precedence
        ret.attrs[key] = g.attrs[key]
      }
    }
  }
  return ret
}

const globalRemoteH5Files: { [url: string]: RemoteH5File } = {}
export const getRemoteH5File = async (url: string, metaUrl: string | undefined) => {
  const kk = url + '|' + metaUrl
  if (!globalRemoteH5Files[kk]) {
    globalRemoteH5Files[kk] = new RemoteH5File(url, metaUrl)
  }
  return globalRemoteH5Files[kk]
}

const globalMergedRemoteH5Files: { [kk: string]: MergedRemoteH5File } = {}
export const getMergedRemoteH5File = async (urls: string[], metaUrls: (string | undefined)[]) => {
  if (urls.length === 0) throw Error(`Length of urls must be > 0`)
  if (metaUrls.length !== urls.length) throw Error(`Length of metaUrls must be equal to length of urls`)
  if (urls.length === 1) {
    return await getRemoteH5File(urls[0], metaUrls[0])
  }
  const kk = urls.join('|') + '|||' + metaUrls.join('|')
  if (!globalMergedRemoteH5Files[kk]) {
    const files = await Promise.all(urls.map((url, i) => getRemoteH5File(url, metaUrls[i])))
    globalMergedRemoteH5Files[kk] = new MergedRemoteH5File(files)
  }
  return globalMergedRemoteH5Files[kk]
}

const product = (x: number[]) => {
  let p = 1
  for (let i = 0; i < x.length; i++) p *= x[i]
  return p
}