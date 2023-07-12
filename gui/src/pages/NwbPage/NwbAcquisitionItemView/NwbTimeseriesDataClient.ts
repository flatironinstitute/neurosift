/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { useEffect, useState } from "react"
import { useGroup } from "../NwbMainView/NwbMainView"
import { DatasetDataType, RemoteH5Dataset, RemoteH5File } from "../RemoteH5File/RemoteH5File"

class TimestampFinder {
    #chunkSize = 100000
    #chunks: {[key: number]: DatasetDataType} = {}
    constructor (private nwbFile: RemoteH5File, private timestampsDataset: RemoteH5Dataset, private estimatedSamplingFrequency: number) {
    }
    async getDataIndexForTime(time: number): Promise<number> {
        let iLower = 0
        let iUpper = this.timestampsDataset.shape[0] - 1
        if (iUpper === iLower) return iLower
        let tLower = await this._get(iLower)
        let tUpper = await this._get(iUpper)
        while (iUpper - iLower > 1) {
            if (time < tLower) {
                return iLower
            }
            if (time > tUpper) {
                return iUpper
            }
            let estimatedIndex = iLower + Math.floor((iUpper - iLower) * (time - tLower) / (tUpper - tLower))
            if (estimatedIndex <= iLower) estimatedIndex = Math.floor((iUpper + iLower) / 2)
            if (estimatedIndex >= iUpper) estimatedIndex = Math.floor((iUpper + iLower) / 2)
            const estimatedT = await this._get(estimatedIndex)
            if (estimatedT === time) {
                return estimatedIndex
            }
            if (estimatedT < time) {
                iLower = estimatedIndex
                tLower = estimatedT
            }
            else {
                iUpper = estimatedIndex
                tUpper = estimatedT
            }
        }
        const distToLower = Math.abs(time - tLower)
        const distToUpper = Math.abs(time - tUpper)
        if (distToLower < distToUpper) return iLower
        else return iUpper
    }
    async _get(i: number) {
        const chunkIndex = Math.floor(i / this.#chunkSize)
        if (!(chunkIndex in this.#chunks)) {
            this.#chunks[chunkIndex] = await this.nwbFile.getDatasetData(this.timestampsDataset.path, {slice: [[chunkIndex * this.#chunkSize, (chunkIndex + 1) * this.#chunkSize]]})
        }
        return this.#chunks[chunkIndex][i - chunkIndex * this.#chunkSize]
    }
}

class IrregularTimeseriesDataClient {
    #estimatedSamplingFrequency: number | undefined = undefined
    #startTime: number | undefined = undefined
    #endTime: number | undefined = undefined
    #timestampFinder: TimestampFinder | undefined = undefined
    constructor(private nwbFile: RemoteH5File, private objectPath: string) {
    }
    async initialize() {
        const timestampsDataset = await this.nwbFile.getDataset(`${this.objectPath}/timestamps`)
        const numInitialTimestamps = Math.min(10000, timestampsDataset.shape[0])
        const initialTimestamps = await this.getTimestampsForDataIndices(0, numInitialTimestamps)
        const finalTimestamps = await this.getTimestampsForDataIndices(timestampsDataset.shape[0] - 1, timestampsDataset.shape[0])
        this.#estimatedSamplingFrequency = getEstimatedSamplingFrequencyFromTimestamps(initialTimestamps)
        this.#startTime = initialTimestamps[0]
        this.#endTime = finalTimestamps[finalTimestamps.length - 1]
        this.#timestampFinder = new TimestampFinder(this.nwbFile, timestampsDataset, this.#estimatedSamplingFrequency!)
    }
    get startTime(): number | undefined {
        return this.#startTime
    }
    get endTime(): number | undefined {
        return this.#endTime
    }
    get estimatedSamplingFrequency(): number | undefined {
        return this.#estimatedSamplingFrequency
    }
    async getDataIndexForTime(time: number): Promise<number> {
        return await this.#timestampFinder!.getDataIndexForTime(time)
    }
    async getTimestampsForDataIndices(i1: number, i2: number): Promise<DatasetDataType> {
        return await this.nwbFile.getDatasetData(`${this.objectPath}/timestamps`, {slice: [[i1, i2]]})
    }
}

class RegularTimeseriesDataClient {
    #samplingFrequency: number | undefined = undefined
    #startTime: number | undefined = undefined
    #endTime: number | undefined = undefined
    #dataShape: number[] | undefined = undefined
    constructor(private nwbFile: RemoteH5File, private objectPath: string) {
    }
    async initialize() {
        const startingTimeDataset = await this.nwbFile.getDataset(`${this.objectPath}/starting_time`)
        const dataDataset = await this.nwbFile.getDataset(`${this.objectPath}/data`)
        this.#samplingFrequency = startingTimeDataset.attrs['rate'] as number
        this.#startTime = 0 // todo: get starting time from startingTimeDataset
        this.#endTime = this.#startTime + dataDataset.shape[0] / this.#samplingFrequency
        this.#dataShape = dataDataset.shape
    }
    get startTime(): number | undefined {
        return this.#startTime
    }
    get endTime(): number | undefined {
        return this.#endTime
    }
    get estimatedSamplingFrequency(): number | undefined {
        return this.#samplingFrequency
    }
    async getDataIndexForTime(time: number): Promise<number> {
        if (time < this.#startTime!) return 0
        if (time >= this.#endTime!) return this.#dataShape![0] - 1
        return Math.round((time - this.#startTime!) * this.#samplingFrequency!)
    }
    async getTimestampsForDataIndices(i1: number, i2: number): Promise<DatasetDataType> {
        const ret = new Float32Array(i2 - i1)
        for (let i = i1; i < i2; i++) {
            ret[i - i1] = this.#startTime! + i / this.#samplingFrequency!
        }
        return ret
    }
}

interface NwbTimeseriesDataClient {
    initialize: () => Promise<void>
    startTime: number | undefined
    endTime: number | undefined
    estimatedSamplingFrequency: number | undefined
    getDataIndexForTime: (time: number) => Promise<number>
    getTimestampsForDataIndices: (i1: number, i2: number) => Promise<DatasetDataType>
}

export const useNwbTimeseriesDataClient = (nwbFile: RemoteH5File, objectPath: string) => {
    const group = useGroup(nwbFile, objectPath)
    const [dataClient, setDataClient] = useState<NwbTimeseriesDataClient | undefined>(undefined)
    useEffect(() => {
        if (!nwbFile) return
        if (!group) return
        let canceled = false
        const load = async () => {
            if (group.datasets.find(ds => (ds.name === 'timestamps'))) {
                const client = new IrregularTimeseriesDataClient(nwbFile, objectPath)
                await client.initialize()
                if (canceled) return
                setDataClient(client)
            }
            else {
                const client = new RegularTimeseriesDataClient(nwbFile, objectPath)
                await client.initialize()
                if (canceled) return
                setDataClient(client)
            }
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, objectPath, group])
    return dataClient
}

const getEstimatedSamplingFrequencyFromTimestamps = (timestamps: DatasetDataType): number => {
    if (timestamps.length < 2) return 1
    const deltas: number[] = []
    for (let i = 1; i < timestamps.length; i ++) {
        deltas.push(timestamps[i] - timestamps[i - 1])
    }
    const sortedDeltas = deltas.sort((a, b) => a - b)
    const medianDelta = sortedDeltas[Math.floor(sortedDeltas.length / 2)]
    return 1 / medianDelta
}