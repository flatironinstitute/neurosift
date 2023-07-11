/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useContext, useEffect, useMemo, useState } from "react"
import TimeScrollView2, { useTimeScrollView2 } from "../../../package/component-time-scroll-view-2/TimeScrollView2"
import { useTimeRange, useTimeseriesSelectionInitialization } from "../../../package/context-timeseries-selection"
import { NwbFileContext } from "../NwbFileContext"
import { useDataset } from "../NwbMainView/NwbMainView"
import { Canceler } from "../RemoteH5File/helpers"
import { useNwbTimeseriesDataClient } from "./NwbTimeseriesDataClient"
import TimeseriesDatasetChunkingClient from "./TimeseriesDatasetChunkingClient"
import TimeseriesSelectionBar, { timeSelectionBarHeight } from "./TimeseriesSelectionBar"
import { DataSeries, Opts } from "./WorkerTypes"

type Props = {
    width: number
    height: number
    objectPath: string
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

const hideToolbar = false

const NwbTimeseriesView: FunctionComponent<Props> = ({ width, height, objectPath }) => {
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()
    const [worker, setWorker] = useState<Worker | null>(null)
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const [datasetChunkingClient, setDatasetChunkingClient] = useState<TimeseriesDatasetChunkingClient | undefined>(undefined)
    const {visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange } = useTimeRange()

    const dataset = useDataset(nwbFile, `${objectPath}/data`)

    const dataClient = useNwbTimeseriesDataClient(nwbFile, objectPath)
    const startTime = dataClient ? dataClient.startTime! : undefined
    const endTime = dataClient ? dataClient.endTime! : undefined
    useTimeseriesSelectionInitialization(startTime, endTime)

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height: height - timeSelectionBarHeight, hideToolbar})

    // Set chunkSize
    const chunkSize = useMemo(() => (
        dataset ? Math.floor(1e4 / (dataset.shape[1] || 1)) : 0
    ), [dataset])

    // set visible time range
    useEffect(() => {
        if (!chunkSize) return
        if (!dataClient) return
        if (startTime === undefined) return
        if (endTime === undefined) return
        setVisibleTimeRange(startTime, startTime + Math.min(chunkSize / dataClient.estimatedSamplingFrequency! * 3, endTime))
    }, [chunkSize, dataClient, setVisibleTimeRange, startTime, endTime])

    // Set the datasetChunkingClient
    useEffect(() => {
        if (!nwbFile) return
        if (!dataset) return
        const client = new TimeseriesDatasetChunkingClient(nwbFile, dataset, chunkSize)
        setDatasetChunkingClient(client)
    }, [dataset, nwbFile, chunkSize])

    // Set startChunkIndex and endChunkIndex
    const [startChunkIndex, setStartChunkIndex] = useState<number | undefined>(undefined)
    const [endChunkIndex, setEndChunkIndex] = useState<number | undefined>(undefined)
    const [zoomInRequired, setZoomInRequired] = useState<boolean>(false)
    useEffect(() => {
        if ((!dataset) || (visibleStartTimeSec === undefined) || (visibleEndTimeSec === undefined) || (!dataClient)) {
            setStartChunkIndex(undefined)
            setEndChunkIndex(undefined)
            setZoomInRequired(false)
            return
        }
        let canceled = false
        const load = async () => {
            const maxVisibleDuration = 1e6 / (dataset.shape[1] || 1) / dataClient.estimatedSamplingFrequency!
            const zoomInRequired = (visibleEndTimeSec - visibleStartTimeSec > maxVisibleDuration)
            if (zoomInRequired) {
                setStartChunkIndex(undefined)
                setEndChunkIndex(undefined)
                setZoomInRequired(true)
                return
            }
            const iStart = await dataClient.getDataIndexForTime(visibleStartTimeSec)
            if (canceled) return
            const iEnd = await dataClient.getDataIndexForTime(visibleEndTimeSec)
            if (canceled) return
            const startChunkIndex = Math.floor(iStart / chunkSize)
            const endChunkIndex = Math.floor(iEnd / chunkSize) + 1
            setStartChunkIndex(startChunkIndex)
            setEndChunkIndex(endChunkIndex)
            setZoomInRequired(zoomInRequired)
        }
        load()
        return () => {canceled = true}
    }, [dataset, visibleStartTimeSec, visibleEndTimeSec, chunkSize, dataClient])

    // Set dataSeries
    const [dataSeries, setDataSeries] = useState<DataSeries[] | undefined>(undefined)
    useEffect(() => {
        if (!datasetChunkingClient) return
        if (dataset === undefined) return
        if (startChunkIndex === undefined) return
        if (endChunkIndex === undefined) return
        if (dataClient === undefined) return
        if (zoomInRequired) return

        let canceler: Canceler | undefined = undefined
        let canceled = false
        const load = async () => {
            let finished = false
            const tt = await dataClient.getTimestampsForDataIndices(startChunkIndex * chunkSize, endChunkIndex * chunkSize)
            while (!finished) {
                try {
                    canceler = {onCancel: []}
                    const {concatenatedChunk, completed} = await datasetChunkingClient.getConcatenatedChunk(startChunkIndex, endChunkIndex, canceler)
                    canceler = undefined
                    if (completed) finished = true
                    if (canceled) return
                    const dataSeries: DataSeries[] = []
                    for (let i = 0; i < concatenatedChunk.length; i ++) {
                        dataSeries.push({
                            type: 'line',
                            title: `ch${i}`,
                            attributes: {color: 'black'},
                            t: Array.from(tt),
                            y: concatenatedChunk[i]
                        })
                    }
                    setDataSeries(dataSeries)
                }
                catch(err: any) {
                    if (err.message !== 'canceled') {
                        throw err
                    }
                }
            }
        }
        load()
        return () => {
            canceled = true
            if (canceler) canceler.onCancel.forEach(cb => cb())
        }
    }, [chunkSize, datasetChunkingClient, dataset, startChunkIndex, endChunkIndex, dataClient, zoomInRequired])

    // Set valueRange
    const [valueRange, setValueRange] = useState<{min: number, max: number} | undefined>(undefined)
    useEffect(() => {
        if (!dataSeries) return
        let min = 0
        let max = 0
        for (let i = 0; i < dataSeries.length; i ++) {
            const y = dataSeries[i].y
            for (let j = 0; j < y.length; j ++) {
                if (!isNaN(y[j])) {
                    if (y[j] < min) min = y[j]
                    if (y[j] > max) max = y[j]
                }
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

export default NwbTimeseriesView