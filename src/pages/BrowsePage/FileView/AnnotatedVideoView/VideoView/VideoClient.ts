import RtcshareFileSystemClient from "../../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import splitMjpeg from "./splitMjpeg"

const numFramesPerChunk = 20

class VideoClient {
    #chunks: {[chunkIndex: number]: ArrayBuffer[]} = {}
    #fetchingChunks = new Set<number>()
    #failedChunks = new Set<number>()
    #fetchingInfo = false
    #info?: {width: number, height: number, fps: number, frame_count: number}
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {

    }
    async _getInfo(): Promise<{width: number, height: number, fps: number, frame_count: number}> {
        if (this.#info) return this.#info
        if (this.#fetchingInfo) {
            while (this.#fetchingInfo) {
                await sleepMsec(10)
            }
            if (!this.#info) throw Error('Unable to fetch video info')
            return this.#info
        }
        this.#fetchingInfo = true
        const {result} = await this.rtcshareClient.serviceQuery('video', {
            type: 'get_video_info',
            path: this.uri
        })
        this.#info = result.info
        this.#fetchingInfo = false
        if (!this.#info) throw Error('Problem fetching video info')
        return this.#info
    }
    async videoInfo() {
        const info = await this._getInfo()
        return info
    }
    async getFrameImage(frameIndex: number) {
        const info = await this._getInfo()
        const chunkIndex = Math.floor(frameIndex / numFramesPerChunk)
        await this._fetchChunk(chunkIndex)
        if (chunkIndex + 1 * numFramesPerChunk < info.frame_count) {
            this._fetchChunk(chunkIndex + 1) // initiate fetching of the next chunk
        }
        return this.#chunks[chunkIndex][frameIndex % numFramesPerChunk]
    }
    async _fetchChunk(i: number): Promise<undefined> {
        if (this.#chunks[i]) return
        if (this.#fetchingChunks.has(i)) {
            while (this.#fetchingChunks.has(i)) {
                await sleepMsec(100)
            }
            if (!this.#chunks[i]) throw Error(`Unable to fetch chunk ${i}`)
            return
        }
        if (this.#failedChunks.has(i)) {
            // don't try again
            throw Error(`Unable to fetch chunk ${i}`)
        }
        this.#fetchingChunks.add(i)
        const info = await this._getInfo()
        if (i * numFramesPerChunk >= info.frame_count) throw Error(`Chunk ${i} is out of range`)
        try {
            const {binaryPayload} = await this.rtcshareClient.serviceQuery('video', {
                type: 'get_video_frames',
                path: this.uri,
                start_frame: i * numFramesPerChunk,
                end_frame: Math.min((i + 1) * numFramesPerChunk, info.frame_count),
                quality: 40
            })
            if (!binaryPayload) throw Error('No binary payload')
            this.#chunks[i] = splitMjpeg(binaryPayload)
        }
        catch(err: any) {
            this.#failedChunks.add(i)
            throw Error(`Unable to fetch chunk ${i}: ${err.message}`)
        }
        finally {
            this.#fetchingChunks.delete(i)
        }
    }
}

async function sleepMsec(msec: number) {
    return new Promise(resolve => {
        setTimeout(resolve, msec)
    })
}

export default VideoClient