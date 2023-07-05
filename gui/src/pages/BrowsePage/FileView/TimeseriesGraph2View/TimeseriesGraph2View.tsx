/* eslint-disable @typescript-eslint/no-non-null-assertion */
import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import TimeScrollView2, { useTimeScrollView2 } from '../../../../package/component-time-scroll-view-2/TimeScrollView2'
import { useTimeRange, useTimeseriesSelectionInitialization } from '../../../../package/context-timeseries-selection'
import TimeseriesGraph2Client from './TimeseriesGraph2Client'
import { Opts } from './WorkerTypes'

type Props = {
    client: TimeseriesGraph2Client
    width: number
    height: number
}

const TimeseriesGraph2View: FunctionComponent<Props> = ({client, width, height}) => {
    const headerRecord = useMemo(() => (
        client.headerRecord!
    ), [client])

    const {series, yRange, timeOffset, gridlineOpts, legendOpts, hideToolbar} = headerRecord

    // This component ignores timeOffset except in the following two hooks
    useTimeseriesSelectionInitialization(headerRecord.startTimeSec, headerRecord.endTimeSec, timeOffset || 0)
    const {visibleStartTimeSec, visibleEndTimeSec } = useTimeRange(timeOffset || 0) // timeOffset is subtracted from start and end after getting from the global state

    const {blockStartIndex, blockEndIndex, zoomInRequired} = useMemo(() => {
        if ((visibleStartTimeSec === undefined) || (visibleEndTimeSec === undefined)) {
            return {blockStartIndex: undefined, blockEndIndex: undefined, zoomInRequired: false}
        }
        if (visibleEndTimeSec - visibleStartTimeSec > 60 * 60) {
            return {blockStartIndex: undefined, blockEndIndex: undefined, zoomInRequired: true}
        }
        const startTimeSec = client.startTimeSec!
        const blockSizeSec = client.blockSizeSec!
        const blockStartIndex = Math.floor((visibleStartTimeSec - startTimeSec) / blockSizeSec)
        const blockEndIndex = Math.floor((visibleEndTimeSec - startTimeSec) / blockSizeSec) + 1
        return {blockStartIndex, blockEndIndex, zoomInRequired: false}
    }, [client, visibleStartTimeSec, visibleEndTimeSec])

    const [datasets, setDatasets] = useState<any[]>([])
    useEffect(() => {
        let canceled = false
        if (blockStartIndex === undefined) return
        if (blockEndIndex === undefined) return

        (async () => {
            const dd = await client.getDatasets(blockStartIndex, blockEndIndex)
            if (canceled) return
            setDatasets(dd)
        })()

        return () => {canceled = true}
    }, [blockStartIndex, blockEndIndex, client])

    const resolvedSeries = useMemo(() => (
        series.map(s => {
            const ds = datasets.filter(d => (d.name === s.dataset))[0]
            if (ds === undefined) {
                return {
                    ...s,
                    t: [],
                    y: []
                }
            }
            return {
                ...s,
                t: ds.data[s.encoding['t']],
                y: ds.data[s.encoding['y']]
            }
        })
    ), [series, datasets])

    const {minValue, maxValue} = useMemo(() => (
        yRange ? ({minValue: yRange[0], maxValue: yRange[1]}) : {
            minValue: min(resolvedSeries.map(s => (min(s.y)))),
            maxValue: max(resolvedSeries.map(s => (max(s.y))))
        }
    ), [yRange, resolvedSeries])

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height, hideToolbar})

    const [hideLegend, setHideLegend] = useState<boolean>(false)

    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()
    const [worker, setWorker] = useState<Worker | null>(null)

    useEffect(() => {
        if (!canvasElement) return
        const worker = new Worker(new URL('./worker', import.meta.url))
        const offscreenCanvas = canvasElement.transferControlToOffscreen();
        worker.postMessage({
            canvas: offscreenCanvas,
        }, [offscreenCanvas])

		setWorker(worker)

        return () => {
            worker.terminate()
        }
    }, [canvasElement])

    useEffect(() => {
        if (!worker) return
        worker.postMessage({
            resolvedSeries
        })
    }, [resolvedSeries, worker])

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
            hideLegend,
            legendOpts: legendOpts || {location: 'northeast'},
            minValue,
            maxValue,
            zoomInRequired
        }
        worker.postMessage({
            opts
        })
    }, [canvasWidth, canvasHeight, margins, visibleStartTimeSec, visibleEndTimeSec, worker, hideLegend, legendOpts, minValue, maxValue, zoomInRequired])

    // useEffect(() => {
    //     if (!worker) return
    //     if (!data.annotation) return
    //     worker.postMessage({
    //         annotation: data.annotation
    //     })
    // }, [worker, data.annotation])

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'l') {
            setHideLegend(v => (!v))
        }
    }, [])

    const yAxisInfo = useMemo(() => ({
        showTicks: true,
        yMin: minValue,
        yMax: maxValue
    }), [minValue, maxValue])

    const content = (
        <TimeScrollView2
            onCanvasElement={elmt => setCanvasElement(elmt)}
            gridlineOpts={gridlineOpts}
            onKeyDown={handleKeyDown}
            width={width}
            height={height}
            yAxisInfo={yAxisInfo}
            hideToolbar={hideToolbar}
        />
    )
    return content
}

const min = (a: number[]) => {
    let ret: number | undefined = undefined
    for (const val of a) {
        if (!isNaN(val)) {
            if (ret === undefined) ret = val
            else ret = Math.min(ret, val)
        }
    }
    return ret === undefined ? 0 : ret
}

const max = (a: number[]) => {
    let ret: number | undefined = undefined
    for (const val of a) {
        if (!isNaN(val)) {
            if (ret === undefined) ret = val
            else ret = Math.max(ret, val)
        }
    }
    return ret === undefined ? 0 : ret
}

export default TimeseriesGraph2View