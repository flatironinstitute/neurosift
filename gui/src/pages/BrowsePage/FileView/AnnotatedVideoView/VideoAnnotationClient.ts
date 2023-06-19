import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "./JsonlClient"

export type VideoAnnotationElement = {
    t: 'n' // node
    i: string // ID
    x: number
    y: number
} | {
    t: 'e' // edge
    i: string // ID
    i1: string // node ID 1
    i2: string // node ID 2
}

export type VideoAnnotationFrame = {
    e: VideoAnnotationElement[]
}

export type VideoAnnotationNode = {
    id: string
    label: string
    colorIndex?: number
}

class VideoAnnotationClient {
    #jsonlClient: JsonlClient
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {
        this.#jsonlClient = new JsonlClient(uri, rtcshareClient)
    }
    async initialize() {
        await this.#jsonlClient.initialize()
    }
    async getFrame(frameIndex: number): Promise<undefined | VideoAnnotationFrame> {
        const d = await this.#jsonlClient.getRecord(frameIndex + 1)
        return d ? d as any as VideoAnnotationFrame : undefined
    }
    async getNodes(): Promise<undefined | VideoAnnotationNode[]> {
        const d = await this.#jsonlClient.getRecord(0)
        return d ? d.nodes as any as VideoAnnotationNode[] : undefined
    }
}

export default VideoAnnotationClient