/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { DatasetDataType, getRemoteH5File, RemoteH5File } from "../../../TestPage/RemoteH5File/RemoteH5File"

class SpikeTrainsClientFromRemoteNwb {
    #nwbFile: RemoteH5File | undefined
    #unitIds: DatasetDataType | undefined
    #spikeTimesIndices: DatasetDataType | undefined
    // #spikeTimes: DatasetDataType | undefined
    #startTimeSec: number | undefined
    #endTimeSec: number | undefined
    #blockSizeSec = 60 * 5
    constructor(private url: string) {
    }
    async initialize() {
        const nwbFile = await getRemoteH5File(this.url, undefined)
        this.#nwbFile = nwbFile
        this.#unitIds = await nwbFile.getDatasetData('/units/id', {})
        this.#spikeTimesIndices = await nwbFile.getDatasetData('/units/spike_times_index', {})
        const v1 = await nwbFile.getDatasetData('/units/spike_times', {slice: [[0, 1]]})
        const n = this.#spikeTimesIndices[this.#spikeTimesIndices.length - 1]
        const v2 = await nwbFile.getDatasetData('/units/spike_times', {slice: [[n - 1, n]]})
        this.#startTimeSec = v1[0]
        this.#endTimeSec = v2[0]
    }
    get startTimeSec() {
        return this.#startTimeSec
    }
    get endTimeSec() {
        return this.#endTimeSec
    }
    get blockSizeSec() {
        return this.#blockSizeSec
    }
    get unitIds() {
        if (!this.#unitIds) throw Error('Unexpected: unitIds not initialized')
        return Array.from(this.#unitIds)
    }
    async getData(blockStartIndex: number, blockEndIndex: number) {
        await this.initialize()
        if (!this.#unitIds) throw Error('Unexpected: unitIds not initialized')
        if (!this.#spikeTimesIndices) throw Error('Unexpected: spikeTimesIndices not initialized')
        if (!this.#nwbFile) throw Error('Unexpected: nwbFile not initialized')
        // if (!this.#spikeTimes) throw Error('Unexpected: spikeTimes not initialized')
        const ret: {
            unitId: number | string
            spikeTimesSec: number[]
        }[] = []
        const t1 = this.#startTimeSec! + blockStartIndex * this.#blockSizeSec
        const t2 = this.#startTimeSec! + blockEndIndex * this.#blockSizeSec
        for (let ii = 0; ii < this.#unitIds.length; ii++) {
            const i1 = ii === 0 ? 0 : this.#spikeTimesIndices[ii - 1]
            const i2 = this.#spikeTimesIndices[ii]

            const tt0 = await this.#nwbFile.getDatasetData('/units/spike_times', {slice: [[i1, Math.min(i2, i1 + 100)]]})

            const tt = Array.from(tt0.filter((t: number) => (t >= t1 && t < t2)))
            ret.push({
                unitId: this.#unitIds[ii],
                spikeTimesSec: tt
            })
        }
        return ret
    }
}

const minOfArray = (x: DatasetDataType) => {
    let min = Infinity
    for (let i = 0; i < x.length; i++) {
        if (x[i] < min) min = x[i]
    }
    return min
}

const maxOfArray = (x: DatasetDataType) => {
    let max = -Infinity
    for (let i = 0; i < x.length; i++) {
        if (x[i] > max) max = x[i]
    }
    return max
}

export default SpikeTrainsClientFromRemoteNwb