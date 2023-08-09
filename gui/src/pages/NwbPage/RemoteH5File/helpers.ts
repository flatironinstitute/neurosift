/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { globalRemoteH5FileStats } from "./RemoteH5File"

type RRequest = {
  requestId: string
  request: any
  onResolved: (resp: any) => void
  onRejected: (err: Error) => void
}

export type Canceler = {onCancel: (() => void)[]}

class RemoteH5WorkerWrapper {
  #worker: Worker
  #pendingRequests: RRequest[] = []
  #runningRequest: RRequest | undefined = undefined
  constructor() {
    this.#worker = new Worker(new URL('./RemoteH5Worker.js', import.meta.url), { type: 'module' })
  }
  get numRunningRequests() {
    return this.#runningRequest ? 1 : 0
  }
  get numPendingRequests() {
    return this.#pendingRequests.length
  }
  get numRequests() {
    return this.numRunningRequests + this.numPendingRequests
  }
  async postRequest(req: any, canceler: Canceler) {
    const requestId = Math.random().toString()
    const resp = await new Promise<any>((resolve, reject) => {
      this.#pendingRequests.push({requestId, request: req, onResolved: resolve, onRejected: reject})
      canceler.onCancel.push(() => {
        const ind = this.#pendingRequests.findIndex(rr => rr.requestId === requestId)
        if (ind >= 0) {
          this.#pendingRequests.splice(ind, 1)
          reject(new Error('canceled'))
        }
      })
      this._processPendingRequests()
    })
    return resp
  }
  _processPendingRequests = () => {
    if (this.#runningRequest) return
    if (this.#pendingRequests.length === 0) return
    const rr = this.#pendingRequests.shift()!
    this.#runningRequest = rr
    let completed = false
    const doResolve = (resp: any) => {
      if (completed) return
      completed = true
      this.#worker.removeEventListener('message', listener)
      rr.onResolved(resp)
      this.#runningRequest = undefined
      this._processPendingRequests()
    }
    const doReject = (err: Error) => {
      if (completed) return
      completed = true
      this.#worker.removeEventListener('message', listener)
      rr.onRejected(err)
      this.#runningRequest = undefined
      this._processPendingRequests()
    }
    const listener = (e: MessageEvent) => {
      const d = e.data
      if ((d.type === 'response') && (d.requestId === rr.requestId)) {
        if (d.response.success) {
          doResolve(d.response)
        }
        else {
          doReject(new Error(d.response.error))
        }
      }
    }
    this.#worker.addEventListener('message', listener)
    this.#worker.postMessage({
      type: 'request',
      requestId: rr.requestId,
      request: rr.request
    })
    setTimeout(() => {
      doReject(new Error('timeout'))
    }, 60000 * 3)
  }
}

// While it sounds like a good idea to have a lot of workers (for concurrent http requests), there is a problem
// in that each worker needs to load the meta information for the hdf5 file... which takes some time
// therefore too many workers => initial slowdown
const numWorkers = 1
class RemoteH5WorkerManager {
  #workers: RemoteH5WorkerWrapper[] = []
  constructor() {
    for (let i = 0; i < numWorkers; i++) {
      this.#workers.push(new RemoteH5WorkerWrapper())
    }
  }
  async postRequest(req: any, canceler: Canceler) {
    const worker = this.#workers.sort((a, b) => a.numRequests - b.numRequests)[0]
    return await worker.postRequest(req, canceler)
  }
}
const workerManager = new RemoteH5WorkerManager()

export const postRemoteH5WorkerRequest = async (req: any, canceler: Canceler) => {
  globalRemoteH5FileStats.numPendingRequests ++
  try {
    const ret = await workerManager.postRequest(req, canceler)
    return ret
  }
  finally {
    globalRemoteH5FileStats.numPendingRequests --
  }
}