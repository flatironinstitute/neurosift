import postApiRequest from "../postApiRequest"
import { isReadDirResponse, isReadFileResponse, ReadDirRequest, ReadFileRequest, RtcshareDir, RtcshareFile, ServiceQueryRequest, isServiceQueryResponse } from "../RtcshareRequest"

class RtcshareFileSystemClient {
    #rootDir?: RtcshareDir
    constructor() {}
    async readDir(path: string): Promise<RtcshareDir & {dirs: RtcshareDir[], files: RtcshareFile[]}> {
        if ((!path) || (path === '/')) {
            const rr = this.#rootDir
            if ((rr) && (hasDirsAndFiles(rr))) {
                return rr
            }
            else {
                const {dirs, files} = await this._retrieveDir('')
                const newRoot = {name: '', dirs, files}
                this.#rootDir = newRoot
                return newRoot
            }
        }
        const aa = path.split('/')
        const parentPath = aa.slice(0, aa.length - 1).join('/')
        const dirName = aa[aa.length - 1]
        const parentDir = await this.readDir(parentPath)
        const x = parentDir.dirs.find(a => (a.name === dirName))
        if (!x) throw Error(`Directory not found: ${path}`)
        if (hasDirsAndFiles(x)) {
            return x
        }
        else {
            const {dirs, files} = await this._retrieveDir(path)
            x.dirs = dirs
            x.files = files
            return {name: x.name, dirs, files}
        }
    }
    async readFile(path: string, start?: number, end?: number, opts: {forceReload?: boolean}={}): Promise<ArrayBuffer> {
        if ((path.startsWith('http://')) || (path.startsWith('https://'))) {
            return await readFileFromUrl(path, start, end)
        }

        if (!path) throw Error('Path is empty')
        const aa = path.split('/')
        const parentPath = aa.slice(0, aa.length - 1).join('/')
        const fileName = aa[aa.length - 1]
        const dir = await this.readDir(parentPath)
        const ff = dir.files.find(x => (x.name === fileName))
        if (!ff) throw Error(`File not found: ${path}`)
        if ((ff.content) && (!opts.forceReload)) {
            if (start === undefined) {
                return ff.content
            }
            else {
                return ff.content.slice(start, end)
            }
        }
        else {
            const req: ReadFileRequest = {
                type: 'readFileRequest',
                path,
                start,
                end
            }
            const {response: resp, binaryPayload} = await postApiRequest(req)
            if (!isReadFileResponse(resp)) {
                console.warn(resp)
                throw Error('Unexpected readFile response')
            }
            if (!binaryPayload) {
                throw Error('Unexpected: no binary payload')
            }
            if (start === undefined) {
                ff.content = binaryPayload
            }
            return binaryPayload
        }

    }
    async serviceQuery(serviceName: string, query: any, userId: string | undefined=undefined): Promise<{result: any, binaryPayload?: ArrayBuffer}> {
        const req: ServiceQueryRequest = {
            type: 'serviceQueryRequest',
            serviceName,
            query
        }
        if (userId) {
            req.userId = userId
        }
        const {response: resp, binaryPayload} = await postApiRequest(req)
        if (!isServiceQueryResponse(resp)) {
            console.warn(resp)
            throw Error('Unexpected serviceQuery response')
        }
        return {result: resp.result, binaryPayload}
    }
    async _retrieveDir(path: string): Promise<{dirs: RtcshareDir[], files: RtcshareFile[]}> {
        const req: ReadDirRequest = {
            type: 'readDirRequest',
            path
        }
        const {response: resp} = await postApiRequest(req)
        if (!isReadDirResponse(resp)) {
            console.warn(resp)
            throw Error('Unexpected readDir response')
        }
        const {dirs, files} = resp
        return {dirs, files}
    }
}

function hasDirsAndFiles(dir: RtcshareDir): dir is RtcshareDir & {dirs: RtcshareDir[], files: RtcshareFile[]} {
    return dir.dirs !== undefined && dir.files !== undefined
}

const readFileFromUrl = async (url: string, start?: number, end?: number): Promise<ArrayBuffer> => {
    const headers: {[key: string]: string} = {}
    if ((start !== undefined) && (end !== undefined)) {
        const range = `bytes=${start}-${end - 1}`
        headers['Range'] = range
    }
    const response = await fetch(url, {
        headers
    })
    if (!response.ok) {
        throw Error(`Error reading file from url: ${url}`)
    }
    return await response.arrayBuffer()
}

export default RtcshareFileSystemClient