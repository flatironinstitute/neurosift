import React, { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import TimeScrollView2, { useTimeScrollView2 } from '../component-time-scroll-view-2/TimeScrollView2'
import { useTimeRange, useTimeseriesSelectionInitialization } from '../context-timeseries-selection'
import { TimeseriesGraphViewData } from './TimeseriesGraphViewData'
import { Opts } from './WorkerTypes'

type Props = {
    data: TimeseriesGraphViewData
    width: number
    height: number
}

const TimeseriesGraphView: FunctionComponent<Props> = ({data, width, height}) => {
    const {datasets, series, legendOpts, timeOffset, yRange, gridlineOpts, hideToolbar} = data

    const resolvedSeries = useMemo(() => (
        series.map(s => {
            const ds = datasets.filter(d => (d.name === s.dataset))[0]
            if (ds === undefined) throw Error(`Dataset not found in series: ${s.dataset}`)
            return {
                ...s,
                t: ds.data[s.encoding['t']],
                y: ds.data[s.encoding['y']]
            }
        })
    ), [series, datasets])

    const {minTime, maxTime} = useMemo(() => (
        {
            minTime: min(resolvedSeries.map(s => (min(s.t)))),
            maxTime: max(resolvedSeries.map(s => (max(s.t))))
        }
    ), [resolvedSeries])

    const {minValue, maxValue} = useMemo(() => (
        yRange ? ({minValue: yRange[0], maxValue: yRange[1]}) : {
            minValue: min(resolvedSeries.map(s => (min(s.y)))),
            maxValue: max(resolvedSeries.map(s => (max(s.y))))
        }
    ), [yRange, resolvedSeries])

    // This component ignores timeOffset except in the following two hooks
    useTimeseriesSelectionInitialization(minTime, maxTime, timeOffset || 0)
    const {visibleStartTimeSec, visibleEndTimeSec } = useTimeRange(timeOffset || 0) // timeOffset is subtracted from start and end after getting from the global state

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height})

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
            maxValue
        }
        worker.postMessage({
            opts
        })
    }, [canvasWidth, canvasHeight, margins, visibleStartTimeSec, visibleEndTimeSec, worker, hideLegend, legendOpts, minValue, maxValue])

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
    return a.reduce((prev, current) => (prev < current) ? prev : current, a[0] || 0)
}

const max = (a: number[]) => {
    return a.reduce((prev, current) => (prev > current) ? prev : current, a[0] || 0)
}

export default TimeseriesGraphView