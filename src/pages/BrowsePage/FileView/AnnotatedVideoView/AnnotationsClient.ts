import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "./JsonlClient"

export type AnnotationElement = {
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

export type AnnotationFrame = {
    e: AnnotationElement[]
}

class AnnotationsClient {
    #jsonlClient: JsonlClient
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {
        this.#jsonlClient = new JsonlClient(uri, rtcshareClient)
    }
    async getFrame(frameIndex: number): Promise<undefined | AnnotationFrame> {
        const d = await this.#jsonlClient.getFrame(frameIndex)
        return d ? d as any as AnnotationFrame : undefined
    }
}

export default AnnotationsClient