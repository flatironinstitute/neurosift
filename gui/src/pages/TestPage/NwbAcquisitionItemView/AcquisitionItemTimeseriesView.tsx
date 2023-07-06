import { FunctionComponent, useContext, useEffect, useMemo, useState } from "react";
import TimeScrollView2, { useTimeScrollView2 } from "../../../package/component-time-scroll-view-2/TimeScrollView2";
import { useTimeRange, useTimeseriesSelectionInitialization } from "../../../package/context-timeseries-selection";
import { NwbFileContext } from "../NwbFileContext";
import { RemoteH5Dataset, RemoteH5File } from "../RemoteH5File/RemoteH5File";
import TimeseriesSelectionBar from "./TimeseriesSelectionBar";
import { DataSeries, Opts } from "./WorkerTypes";

type Props = {
    width: number
    height: number
    itemName: string
}

const gridlineOpts = {
    hideX: false,
    hideY: true
}

const yAxisInfo = {
    showTicks: false,
    yMin: undefined,
    yMax: undefined
}

class DatasetChunkingClient {
    #chunks: {[k: number]: number[][]} = {}
    constructor(private nwbFile: RemoteH5File, private dataset: RemoteH5Dataset, private chunkSize: number) {
    }
    async getConcatenatedChunk(startChunkIndex: number, endChunkIndex: number): Promise<{concatenatedChunk: number[][], completed: boolean}> {
        const timer = Date.now()
        const chunks: (number[][])[] = []
        let completed = true
        for (let ii = startChunkIndex; ii < endChunkIndex; ii ++) {
            if (!this.#chunks[ii]) {
                await this._loadChunk(ii)
            }
            chunks.push(this.#chunks[ii])
            const elapsedSec = (Date.now() - timer) / 1000
            if (elapsedSec > 1) {
                completed = false
                break
            }
        }
        const n1 = sum(chunks.map(ch => ((ch[0] || []).length)))
        const concatenatedChunk: number[][] = []
        const N1 = this.dataset.shape[1] || 1
        for (let i = 0; i < N1; i ++) {
            const x: number[] = []
            for (let j = 0; j < n1; j ++) {
                x.push(NaN)
            }
            concatenatedChunk.push(x)
        }
        let i1 = 0
        for (let ii = startChunkIndex; ii < endChunkIndex; ii ++) {
            const chunk = this.#chunks[ii]
            if (chunk) {
                for (let i = 0; i < chunk.length; i ++) {
                    for (let j = 0; j < chunk[i].length; j ++) {
                        concatenatedChunk[i][i1 + j] = chunk[i][j]
                    }
                }
                i1 += (chunk[0] || []).length
            }
        }
        return {concatenatedChunk, completed}
    }
    private async _loadChunk(chunkIndex: number) {
        const shape = this.dataset.shape
        const i1 = chunkIndex * this.chunkSize
        const i2 = Math.min(i1 + this.chunkSize, shape[0])
        const N1 = Math.min(shape[1] || 1, 5) // for now limit to 5 columns (until we can figure out why reading is so slow)
        const slice: [number, number][] = shape.length === 1 ? [[i1, i2]] : [[i1, i2], [0, N1]]
        const data = await this.nwbFile.getDatasetData(this.dataset.path, {slice})
        const chunk: number[][] = []
        for (let i = 0; i < N1; i ++) {
            const x: number[] = []
            for (let j = 0; j < i2 - i1; j ++) {
                x.push(data[i + j * N1])
            }
            chunk.push(x)
        }
        this.#chunks[chunkIndex] = chunk
    }
}

const hideToolbar = false

const AcquisitionItemTimeseriesView: FunctionComponent<Props> = ({ width, height, itemName }) => {
    const [samplingFrequency, setSamplingFrequency] = useState<number | undefined>(undefined)
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()
    const [worker, setWorker] = useState<Worker | null>(null)
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    const [datasetChunkingClient, setDatasetChunkingClient] = useState<DatasetChunkingClient | undefined>(undefined)
    const startTime = samplingFrequency && dataset ? 0 : undefined
    const endTime = samplingFrequency && dataset ? dataset.shape[0] / samplingFrequency : undefined
    useTimeseriesSelectionInitialization(startTime, endTime)
    const {visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } = useTimeRange()

    // Set dataset and samplingFrequency
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const dset = await nwbFile.getDataset(`acquisition/${itemName}/data`)
            if (canceled) return
            const ds1 = await nwbFile.getDataset(`/acquisition/${itemName}/starting_time`) // this is unintuitive: the sampling rate is an attribute of starting_time-
            if (canceled) return
            setDataset(dset)
            setSamplingFrequency(ds1.attrs['rate'])
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, itemName])

    // Set chunkSize
    const chunkSize = useMemo(() => (
        dataset ? Math.floor(1e5 / (dataset.shape[1] || 1)) : 0
    ), [dataset])

    // set visible time range
    useEffect(() => {
        if (!chunkSize) return
        if (!samplingFrequency) return
        if (!endTime) return
        setVisibleTimeRange(0, Math.min(chunkSize / samplingFrequency * 3, endTime))
    }, [chunkSize, samplingFrequency, setVisibleTimeRange, endTime])
    

    // Set the datasetChunkingClient
    useEffect(() => {
        if (!nwbFile) return
        if (!dataset) return
        const client = new DatasetChunkingClient(nwbFile, dataset, chunkSize)
        setDatasetChunkingClient(client)
    }, [dataset, nwbFile, chunkSize])

    // Set startChunkIndex and endChunkIndex
    const {startChunkIndex, endChunkIndex} = useMemo(() => {
        if ((!dataset) || (visibleStartTimeSec === undefined) || (visibleEndTimeSec === undefined) || (samplingFrequency === undefined)) {
            return {startChunkIndex: undefined, endChunkIndex: undefined}
        }
        const startChunkIndex = Math.floor(visibleStartTimeSec * samplingFrequency / chunkSize)
        const endChunkIndex = Math.floor(visibleEndTimeSec * samplingFrequency / chunkSize) + 1
        return {startChunkIndex, endChunkIndex}
    }, [dataset, visibleStartTimeSec, visibleEndTimeSec, samplingFrequency, chunkSize])

    // Set dataSeries
    const [dataSeries, setDataSeries] = useState<DataSeries[] | undefined>(undefined)
    const [zoomInRequired, setZoomInRequired] = useState<boolean>(false)
    useEffect(() => {
        if (!datasetChunkingClient) return
        if (dataset === undefined) return
        if (startChunkIndex === undefined) return
        if (endChunkIndex === undefined) return
        if (samplingFrequency === undefined) return
        if (visibleStartTimeSec === undefined) return
        if (visibleEndTimeSec === undefined) return

        const maxVisibleDuration = 1e6 / (dataset.shape[1] || 1) / samplingFrequency 
        if (visibleEndTimeSec - visibleStartTimeSec > maxVisibleDuration) {
            setZoomInRequired(true)
            return
        }
        setZoomInRequired(false)

        let canceled = false
        const load = async () => {
            let finished = false
            while (!finished) {
                const {concatenatedChunk, completed} = await datasetChunkingClient.getConcatenatedChunk(startChunkIndex, endChunkIndex)
                if (completed) finished = true
                if (canceled) return
                const dataSeries: DataSeries[] = []
                const tt: number[] = []
                for (let i = 0; i < (concatenatedChunk[0] || []).length; i ++) {
                    tt.push((startChunkIndex * chunkSize + i) / samplingFrequency)
                }
                for (let i = 0; i < concatenatedChunk.length; i ++) {
                    dataSeries.push({
                        type: 'line',
                        title: `ch${i}`,
                        attributes: {color: 'black'},
                        t: tt,
                        y: concatenatedChunk[i]
                    })
                }
                setDataSeries(dataSeries)
            }
        }
        load()
        return () => {canceled = true}
    }, [datasetChunkingClient, startChunkIndex, endChunkIndex, samplingFrequency, visibleStartTimeSec, visibleEndTimeSec, dataset, chunkSize])

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height, hideToolbar})

    // Set valueRange
    const [valueRange, setValueRange] = useState<{min: number, max: number} | undefined>(undefined)
    useEffect(() => {
        if (!dataSeries) return
        let min = 0
        let max = 0
        for (let i = 0; i < dataSeries.length; i ++) {
            const y = dataSeries[i].y
            for (let j = 0; j < y.length; j ++) {
                if (y[j] < min) min = y[j]
                if (y[j] > max) max = y[j]
            }
        }
        setValueRange(old => {
            const min2 = old ? Math.min(old.min, min) : min
            const max2 = old ? Math.max(old.max, max) : max
            return {min: min2, max: max2}
        })
    }, [dataSeries])

    // set opts
    useEffect(() => {
        if (!worker) return
        if (visibleStartTimeSec === undefined) return
        if (visibleEndTimeSec === undefined) return
        const opts: Opts = {
            canvasWidth,
            canvasHeight,
            margins,
            visibleStartTimeSec,
            visibleEndTimeSec,
            hideLegend: true,
            legendOpts: {location: 'northeast'},
            minValue: valueRange ? valueRange.min : 0,
            maxValue: valueRange ? valueRange.max : 1,
            zoomInRequired
        }
        worker.postMessage({
            opts
        })
    }, [canvasWidth, canvasHeight, margins, visibleStartTimeSec, visibleEndTimeSec, worker, valueRange, zoomInRequired])

    // Set worker
    useEffect(() => {
        if (!canvasElement) return
        const worker = new Worker(new URL('./worker', import.meta.url))
        let offscreenCanvas: OffscreenCanvas
        try {
            offscreenCanvas = canvasElement.transferControlToOffscreen();
        }
        catch(err) {
            console.warn(err)
            console.warn('Unable to transfer control to offscreen canvas (expected during dev)')
            return
        }
        worker.postMessage({
            canvas: offscreenCanvas,
        }, [offscreenCanvas])

		setWorker(worker)

        return () => {
            worker.terminate()
        }
    }, [canvasElement])

    // Send dataseries to worker
    useEffect(() => {
        if (!worker) return
        if (!dataSeries) return
        worker.postMessage({
            dataSeries
        })
    }, [worker, dataSeries])

    const timeSelectionBarHeight = 20

    return (
        <div style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', width, height: timeSelectionBarHeight}}>
                <TimeseriesSelectionBar width={width} height={timeSelectionBarHeight - 5} />
            </div>
            <div style={{position: 'absolute', top: timeSelectionBarHeight, width, height: height - timeSelectionBarHeight}}>
                <TimeScrollView2
                    width={width}
                    height={height - timeSelectionBarHeight}
                    onCanvasElement={setCanvasElement}
                    gridlineOpts={gridlineOpts}
                    yAxisInfo={yAxisInfo}
                    hideToolbar={hideToolbar}
                />
            </div>
        </div>
    )
}

const sum = (x: number[]) => {
    let s = 0
    for (let i = 0; i < x.length; i ++) {
        s += x[i]
    }
    return s
}

export default AcquisitionItemTimeseriesView