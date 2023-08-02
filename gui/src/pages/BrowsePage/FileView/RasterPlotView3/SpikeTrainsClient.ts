import deserializeReturnValue from "../../../../deserializeReturnValue"
import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import JsonlClient from "../AnnotatedVideoView/JsonlClient"

export interface SpikeTrainsClientType {
    initialize(): Promise<void>
    startTimeSec: number | undefined
    endTimeSec: number | undefined
    blockSizeSec: number | undefined
    unitIds: (number | string)[] | undefined
    getData(t1: number, t2: number): Promise<{
        unitId: number | string
        spikeTimesSec: number[]
    }[]>
    totalNumSpikes: number | undefined
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
        const uri = filePath.startsWith('http://') || filePath.startsWith('https://') ? filePath : `rtcshare://${filePath}`
        this.#jsonlClient = new JsonlClient(uri, rtcshareClient)
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
    get unitIds() {
        return this.#headerRecord?.units.map(u => (u.unitId))
    }
    async getData(startBlockIndex: number, endBlockIndex: number) {
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

        for (let i = startBlockIndex; i <= endBlockIndex; i++) {
            if ((i >= 0) && (i < this.#headerRecord!.numBlocks)) {
                const block = await deserializeReturnValue(await this.#jsonlClient.getRecord(i + 1))
                for (let j = 0; j < block.units.length; j++) {
                    const unitId = block.units[j].unitId
                    const spikeTimesSec = block.units[j].spikeTimesSec
                    const a = ret.filter(a => (a.unitId === unitId))[0]
                    a.spikeTimesSec = a.spikeTimesSec.concat(spikeTimesSec)
                }
            }
        }

        return ret
    }
    get totalNumSpikes() {
        return this.#headerRecord?.units.reduce((sum, u) => (sum + u.numSpikes), 0)
    }
}

export default SpikeTrainsClient