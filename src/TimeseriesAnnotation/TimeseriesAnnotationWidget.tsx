import { FunctionComponent, useEffect, useMemo, useState } from 'react'
import TimeScrollView2, { useTimeScrollView2 } from '../package/component-time-scroll-view-2/TimeScrollView2'
import { useTimeRange, useTimeseriesSelectionInitialization } from '../package/context-timeseries-selection'
import { TimeseriesAnnotationFileData } from './TimeseriesAnnotationFileData'
import { Opts } from './WorkerTypes'

type Props = {
    data: TimeseriesAnnotationFileData
    width: number
    height: number
}

const gridlineOpts = {
    hideX: false,
    hideY: true
}

const TimeseriesAnnotationWidget: FunctionComponent<Props> = ({data, width, height}) => {
    const {events, event_types} = data

    const timeOffset = 0

    const {minTime, maxTime} = useMemo(() => (
        {
            minTime: min(events.map(e => (e.s))),
            maxTime: max(events.map(e => (e.e)))
        }
    ), [events])

    // This component ignores timeOffset except in the following two hooks
    useTimeseriesSelectionInitialization(minTime, maxTime, timeOffset || 0)
    const {visibleStartTimeSec, visibleEndTimeSec } = useTimeRange(timeOffset || 0) // timeOffset is subtracted from start and end after getting from the global state

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height})

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
            events,
            event_types
        })
    }, [events, event_types, worker])

    useEffect(() => {
        if (!worker) return
        if (visibleStartTimeSec === undefined) return
        if (visibleEndTimeSec === undefined) return
        const opts: Opts = {
            canvasWidth,
            canvasHeight,
            margins,
            visibleStartTimeSec,
            visibleEndTimeSec
        }
        worker.postMessage({
            opts
        })
    }, [canvasWidth, canvasHeight, margins, visibleStartTimeSec, visibleEndTimeSec, worker])

    const content = (
        <TimeScrollView2
            onCanvasElement={elmt => setCanvasElement(elmt)}
            gridlineOpts={gridlineOpts}
            // onKeyDown={handleKeyDown}
            width={width}
            height={height}
            // yAxisInfo={yAxisInfo}
            hideToolbar={false}
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

export default TimeseriesAnnotationWidget