import deserializeReturnValue from "../../../../deserializeReturnValue"
import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "../AnnotatedVideoView/JsonlClient"

export interface SpikeTrainsClientType {
    initialize(): Promise<void>
    startTimeSec: number
    endTimeSec: number
    unitIds: (number | string)[]
    getData(t1: number, t2: number): Promise<{
        unitId: number | string
        spikeTimesSec: number[]
    }[]>
}

/* eslint-disable @typescript-eslint/no-non-null-assertion */
class SpikeTrainsClient {
    #jsonlClient: JsonlClient
    #headerRecord: {
        type: 'SpikeTrains'
        startTimeSec: number
        endTimeSec: number
        blockSizeSec: number
        numBlocks: number
        units: {
            unitId: number | string
            numSpikes: number
        }[]
    } | undefined = undefined
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
    get unitIds() {
        return this.#headerRecord?.units.map(u => (u.unitId))
    }
    async getData(t1: number, t2: number) {
        await this.initialize()
        const ret: {
            unitId: number | string
            spikeTimesSec: number[]
        }[] = []
        for (const unitId of (this.unitIds || [])) {
            ret.push({
                unitId,
                spikeTimesSec: []
            })
        }

        const blockIndex1 = Math.floor(t1 / this.#headerRecord!.blockSizeSec)
        const blockIndex2 = Math.floor(t2 / this.#headerRecord!.blockSizeSec)
        for (let i = blockIndex1; i <= blockIndex2; i++) {
            if ((i >= 0) && (i < this.#headerRecord!.numBlocks)) {
                const block = await deserializeReturnValue(await this.#jsonlClient.getRecord(i + 1))
                for (let j = 0; j < block.units.length; j++) {
                    const unitId = block.units[j].unitId
                    const spikeTimesSec = block.units[j].spikeTimesSec.filter((t: number) => (t >= t1 && t < t2))
                    const a = ret.filter(a => (a.unitId === unitId))[0]
                    a.spikeTimesSec = a.spikeTimesSec.concat(spikeTimesSec)
                }
            }
        }

        return ret
    }
}

export default SpikeTrainsClient