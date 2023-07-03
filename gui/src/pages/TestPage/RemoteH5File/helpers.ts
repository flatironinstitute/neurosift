import { RemoteH5File } from "./RemoteH5File"

const remoteH5Worker = new Worker(new URL('./RemoteH5Worker.js', import.meta.url), { type: 'module' })
export const postRemoteH5WorkerRequest = (req: any) => {
  return new Promise<any>((resolve, reject) => {
    const requestId = Math.random().toString()
    let completed = false
    const listener = (e: MessageEvent) => {
      const d = e.data
      if ((d.type === 'response') && (d.requestId === requestId)) {
        if (completed) return
        const resp = d.response
        completed = true
        remoteH5Worker.removeEventListener('message', listener)
        if (!resp.success) {
          reject(new Error(resp.error))
        }
        else {
          resolve(resp)
        }
      }
      if (e.data.requestId === requestId) {
        if (completed) return
        completed = true
        remoteH5Worker.removeEventListener('message', listener)
        const d = e.data
        if (!d.success) {
          reject(new Error(d.error))
        }
        else {
          resolve(d)
        }
      }
    }
    remoteH5Worker.addEventListener('message', listener)
    remoteH5Worker.postMessage({
      type: 'request',
      requestId: requestId,
      request: req
    })
    setTimeout(() => {
      if (completed) return
      completed = true
      remoteH5Worker.removeEventListener('message', listener)
      reject(new Error('timeout'))
    }, 60000)
  })
}
const remoteH5Files: {[url: string]: RemoteH5File} = {}
export const getRemoteH5File = async (url: string) => {
  if (!remoteH5Files[url]) {
    remoteH5Files[url] = new RemoteH5File(url)
  }
  await remoteH5Files[url].initialize()
  return remoteH5Files[url]
}