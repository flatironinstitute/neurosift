/* eslint-disable @typescript-eslint/no-non-null-assertion */
import deserializeReturnValue from "../../../../deserializeReturnValue"
import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "../AnnotatedVideoView/JsonlClient"

export type TimeseriesGraph2HeaderRecord = {
    type: 'TimeseriesGraph'
    startTimeSec: number
    endTimeSec: number
    blockSizeSec: number
    numBlocks: number
    timeOffset?: number
    legendOpts?: any
    yRange?: [number, number]
    gridlineOpts?: {
        hideX: boolean
        hideY: boolean
    }
    hideToolbar?: boolean
    series: {
        type: string
        dataset: string
        encoding: {[key: string]: string}
        attributes: {[key: string]: any}
        title: string
    }[]
}

class TimeseriesGraph2Client {
    #jsonlClient: JsonlClient
    #headerRecord: TimeseriesGraph2HeaderRecord | undefined = undefined
    #initialized = false
    #initializing = false
    constructor(filePath: string, rtcshareClient: RtcshareFileSystemClient) {
        this.#jsonlClient = new JsonlClient(`rtcshare://${filePath}`, rtcshareClient)
    }
    async initialize() {
        if (this.#initialized) return
        if (this.#initializing) {
            while (!this.#headerRecord) {
                await new Promise(r => setTimeout(r, 100))
            }
            return
        }
        this.#initializing = true
        try {
            await this.#jsonlClient.initialize()
            this.#headerRecord = await this.#jsonlClient.getRecord(0) as any
        }
        finally {
            this.#initializing = false
            this.#initialized = true
        }
    }
    get startTimeSec() {
        return this.#headerRecord?.startTimeSec
    }
    get endTimeSec() {
        return this.#headerRecord?.endTimeSec
    }
    get blockSizeSec() {
        return this.#headerRecord?.blockSizeSec
    }
    get headerRecord(): TimeseriesGraph2HeaderRecord | undefined {
        return this.#headerRecord
    }
    async getDatasets(startBlockIndex: number, endBlockIndex: number) {
        await this.initialize()
        const ret: {
            name: string
            data: {[key: string]: any}[]
        }[] = []

        for (let i = startBlockIndex; i < endBlockIndex; i++) {
            if ((i >= 0) && (i < this.#headerRecord!.numBlocks)) {
                const block = await deserializeReturnValue(await this.#jsonlClient.getRecord(i + 1))
                for (const blockDataset of block.datasets) {
                    const blockDatasetName= blockDataset.name
                    const blockDatasetData = blockDataset.data
                    let aa = ret.filter(a => (a.name === blockDatasetName))[0]
                    if (!aa) {
                        aa = {
                            name: blockDatasetName,
                            data: []
                        }
                        ret.push(aa)
                    }
                    aa.data.push(blockDatasetData)
                }
            }
        }
        const ret2: {
            name: string
            data: {[key: string]: any}
        }[] = []
        for (const aa of ret) {
            ret2.push({
                name: aa.name,
                data: combineDataBlocks(aa.data)
            })
        }
        return ret2
    }
}

const combineDataBlocks = (dataBlocks: {[key: string]: any}[]): {[key: string]: any} => {
    const ret: {[key: string]: any} = {}
    if (dataBlocks.length === 0) return ret
    for (const key in dataBlocks[0]) {
        const vals: any[] = []
        for (const block of dataBlocks) {
            vals.push(block[key])
        }
        ret[key] = concatenateArrays(vals)
    }
    return ret
}

const concatenateArrays = (arrays: any[]): any[] => {
    let totalLength = 0
    for (const arr of arrays) {
        totalLength += arr.length
    }
    const ret = new (arrays[0].constructor)(totalLength)
    let offset = 0
    for (const arr of arrays) {
        for (let i = 0; i < arr.length; i++) {
            ret[offset + i] = arr[i]
        }
        offset += arr.length
    }
    return ret
}

export default TimeseriesGraph2Client