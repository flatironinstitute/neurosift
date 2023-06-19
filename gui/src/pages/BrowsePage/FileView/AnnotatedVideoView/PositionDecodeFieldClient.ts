import deserializeReturnValue from "../../../../deserializeReturnValue"
import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "./JsonlClient"

export type PositionDecodeFieldFrame = {
    indices: number[]
    values: number[]
}

export type PositionDecodeFieldHeader = {
    recordByteLengths: number[]
    bins: {x: number, y: number, w: number, h: number}[]
    frames_per_second: number
    max_value: number
}

class PositionDecodeFieldClient {
    #jsonlClient: JsonlClient
    constructor(private uri: string, private rtcshareClient: RtcshareFileSystemClient) {
        this.#jsonlClient = new JsonlClient(uri, rtcshareClient)
    }
    async getFrame(frameIndex: number): Promise<undefined | PositionDecodeFieldFrame> {
        const d = await this.#jsonlClient.getRecord(frameIndex + 1)
        if (d) {
            const d2 = await deserializeReturnValue(d)
            const indices = d2.indices
            const values = d2.values
            return {
                indices,
                values
            }
        }
        else return undefined
    }
    async getHeader(): Promise<PositionDecodeFieldHeader | undefined> {
        const h = await this.#jsonlClient.getRecord(0)
        return h ? h as PositionDecodeFieldHeader : undefined
    }
}

export default PositionDecodeFieldClient