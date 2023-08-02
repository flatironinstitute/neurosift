/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useContext, useEffect, useState } from "react"
import RasterPlotView3 from "../../../BrowsePage/FileView/RasterPlotView3/RasterPlotView3"
import { NwbFileContext } from "../../NwbFileContext"
import { DatasetDataType, RemoteH5File, RemoteH5Group } from "../../RemoteH5File/RemoteH5File"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const DirectRasterPlotUnitsItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')

    const [spikeTrainsClient, setSpikeTrainsClient] = useState<DirectSpikeTrainsClient | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const client = new DirectSpikeTrainsClient(nwbFile, path)
            await client.initialize()
            if (canceled) return
            setSpikeTrainsClient(client)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])

    const [spikeTrainsClient2, setSpikeTrainsClient2] = useState<DirectSpikeTrainsClientUnitSlice | DirectSpikeTrainsClient | undefined>(undefined)
    useEffect(() => {
        if (!spikeTrainsClient) return
        const maxNumSpikes = 5e5
        const ids = spikeTrainsClient.unitIds
        let ct = 0
        const unitIdsToInclude: (number | string)[] = []
        for (const id of ids) {
            const numSpikes = spikeTrainsClient.numSpikesForUnit(id)
            ct += numSpikes || 0
            if (ct > maxNumSpikes) break
            unitIdsToInclude.push(id)
        }
        if (unitIdsToInclude.length < ids.length) {
            const client = new DirectSpikeTrainsClientUnitSlice(spikeTrainsClient, unitIdsToInclude)
            setSpikeTrainsClient2(client)
        }
        else {
            setSpikeTrainsClient2(spikeTrainsClient)
        }
    }, [spikeTrainsClient])


    if (!spikeTrainsClient2) {
        return <div>Loading spike trains...</div>
    }

    // const maxNumSpikes = 5e5
    // if (spikeTrainsClient.totalNumSpikes! > maxNumSpikes) {
    //     return <div>Too many spikes to display ({spikeTrainsClient.totalNumSpikes} &gt; {maxNumSpikes})</div>
    // }

    return (
        <RasterPlotView3
            width={width}
            height={height}
            spikeTrainsClient={spikeTrainsClient2}
            infoMessage={spikeTrainsClient !== spikeTrainsClient2 ? `Showing ${spikeTrainsClient2.unitIds.length} of ${spikeTrainsClient?.unitIds.length} units` : undefined}
        />
    )
}

class DirectSpikeTrainsClientUnitSlice {
    #unitIds: (number | string)[]
    constructor(private client: DirectSpikeTrainsClient, unitIds: (number | string)[]) {
        this.#unitIds = unitIds
    }
    async initialize() {
    }
    get  startTimeSec() {
        return this.client.startTimeSec
    }
    get endTimeSec() {
        return this.client.endTimeSec
    }
    get blockSizeSec() {
        return this.client.blockSizeSec
    }
    get unitIds() {
        return this.#unitIds
    }
    numSpikesForUnit(unitId: number | string) {
        return this.client.numSpikesForUnit(unitId)
    }
    async getData(blockStartIndex: number, blockEndIndex: number) {
        return this.client.getData(blockStartIndex, blockEndIndex, {unitIds: this.#unitIds})
    }
    get totalNumSpikes() {
        let ret = 0
        for (const id of this.#unitIds) {
            const n = this.client.numSpikesForUnit(id)
            if (n === undefined) return undefined
            ret += n
        }
        return ret
    }
}

export class DirectSpikeTrainsClient {
    #unitIds: any[] | undefined
    #spikeTimesIndices: DatasetDataType | undefined
    // #spikeTimes: DatasetDataType | undefined
    #startTimeSec: number | undefined
    #endTimeSec: number | undefined
    #blockSizeSec = 60 * 5
    #group: RemoteH5Group | undefined
    #spike_or_event: 'spike' | 'event' | undefined = undefined
    constructor(private nwbFile: RemoteH5File, private path: string) {
    }
    async initialize() {
        const path = this.path
        this.#group = await this.nwbFile.getGroup(path)
        if (this.#group.datasets.find(ds => (ds.name === 'spike_times'))) {
            this.#spike_or_event = 'spike'
        }
        else if (this.#group.datasets.find(ds => (ds.name === 'event_times'))) {
            this.#spike_or_event = 'event'
        }
        else {
            this.#spike_or_event = undefined
        }
        this.#unitIds = (await this.nwbFile.getDatasetData(`${path}/id`, {})) as any as (any[] | undefined)
        this.#spikeTimesIndices = await this.nwbFile.getDatasetData(`${path}/${this.#spike_or_event}_times_index`, {})
        const v1 = await this.nwbFile.getDatasetData(`${path}/${this.#spike_or_event}_times`, {slice: [[0, 1]]})
        const n = this.#spikeTimesIndices[this.#spikeTimesIndices.length - 1]
        const v2 = await this.nwbFile.getDatasetData(`${path}/${this.#spike_or_event}_times`, {slice: [[n - 1, n]]})
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
    get totalNumSpikes() {
        if (!this.#spikeTimesIndices) return undefined
        return this.#spikeTimesIndices[this.#spikeTimesIndices.length - 1]
    }
    numSpikesForUnit(unitId: number | string) {
        if (!this.#unitIds) throw Error('Unexpected: unitIds not initialized')
        if (!this.#spikeTimesIndices) throw Error('Unexpected: spikeTimesIndices not initialized')
        const ii = this.#unitIds.indexOf(unitId)
        if (ii < 0) return undefined
        const i1 = ii === 0 ? 0 : this.#spikeTimesIndices[ii - 1]
        const i2 = this.#spikeTimesIndices[ii]
        return i2 - i1
    }
    async getData(blockStartIndex: number, blockEndIndex: number, options: {unitIds?: (number | string)[]}={}) {
        await this.initialize()
        if (!this.#unitIds) throw Error('Unexpected: unitIds not initialized')
        if (!this.#spikeTimesIndices) throw Error('Unexpected: spikeTimesIndices not initialized')
        // if (!this.#spikeTimes) throw Error('Unexpected: spikeTimes not initialized')
        const ret: {
            unitId: number | string
            spikeTimesSec: number[]
        }[] = []
        const t1 = this.#startTimeSec! + blockStartIndex * this.#blockSizeSec
        const t2 = this.#startTimeSec! + blockEndIndex * this.#blockSizeSec
        for (let ii = 0; ii < this.#unitIds.length; ii++) {
            if (options.unitIds) {
                if (!options.unitIds.includes(this.#unitIds[ii])) continue
            }
            const i1 = ii === 0 ? 0 : this.#spikeTimesIndices[ii - 1]
            const i2 = this.#spikeTimesIndices[ii]

            const path = this.path
            const tt0 = await this.nwbFile.getDatasetData(`${path}/${this.#spike_or_event}_times`, {slice: [[i1, i2]]})

            const tt = Array.from(tt0.filter((t: number) => (t >= t1 && t < t2)))
            ret.push({
                unitId: this.#unitIds[ii],
                spikeTimesSec: tt
            })
        }
        return ret
    }
    async getUnitSpikeTrain(unitId: number | string) {
        await this.initialize()
        if (!this.#unitIds) throw Error('Unexpected: unitIds not initialized')
        if (!this.#spikeTimesIndices) throw Error('Unexpected: spikeTimesIndices not initialized')
        const ii = this.#unitIds.indexOf(unitId)
        if (ii < 0) throw Error(`Unexpected: unitId not found: ${unitId}`)
        const i1 = ii === 0 ? 0 : this.#spikeTimesIndices[ii - 1]
        const i2 = this.#spikeTimesIndices[ii]
        const path = this.path
        const tt0 = await this.nwbFile.getDatasetData(`${path}/${this.#spike_or_event}_times`, {slice: [[i1, i2]]})
        return Array.from(tt0)
    }
}

export default DirectRasterPlotUnitsItemView