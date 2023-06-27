import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import TimeScrollView2, { useTimeScrollView2 } from '../../component-time-scroll-view-2/TimeScrollView2'
import { useTimeRange, useTimeseriesSelectionInitialization } from '../../context-timeseries-selection'
import { idToNum, useSelectedUnitIds } from '../../context-unit-selection'
import { getUnitColor } from '../view-units-table'
import { RasterPlotView2Data } from './RasterPlotView2Data'
import { Opts, PlotData } from './WorkerTypes'

type Props = {
    data: RasterPlotView2Data
    width: number
    height: number
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

const RasterPlotView2: FunctionComponent<Props> = ({data, width, height}) => {
    const {startTimeSec, endTimeSec, plots, hideToolbar} = data
    useTimeseriesSelectionInitialization(startTimeSec, endTimeSec)
    const { visibleStartTimeSec, visibleEndTimeSec } = useTimeRange()

    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()
    const [worker, setWorker] = useState<Worker | null>(null)

    const [hoveredUnitId, setHoveredUnitId] = useState<string | number | undefined>(undefined)

    const {selectedUnitIds, unitIdSelectionDispatch} = useSelectedUnitIds()

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        
    }, [])

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

    const plotData = useMemo(() => {
        const ret: PlotData = {
            plots: plots.map(p => ({
                ...p,
                color: getUnitColor(idToNum(p.unitId))
            }))
        }
        return ret
    }, [plots])

    useEffect(() => {
        if (!worker) return
        if (visibleStartTimeSec === undefined) return
        if (visibleEndTimeSec === undefined) return
        const bufferSec = (visibleEndTimeSec - visibleStartTimeSec) / 3
        const plotDataFiltered = {
            plots: plotData.plots.map(plot => ({
                ...plot,
                spikeTimesSec: plot.spikeTimesSec.filter(t => (visibleStartTimeSec - bufferSec <= t) && (t <= visibleEndTimeSec + bufferSec))
            }))
        }
        worker.postMessage({
            plotData: plotDataFiltered
        })
    }, [plotData, worker, visibleStartTimeSec, visibleEndTimeSec])

    const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height})

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
            hoveredUnitId,
            selectedUnitIds: [...selectedUnitIds]
        }
        worker.postMessage({
            opts
        })
    }, [canvasWidth, canvasHeight, margins, visibleStartTimeSec, visibleEndTimeSec, worker, hoveredUnitId, selectedUnitIds])

    const numUnits = plots.length

    const pixelToUnitId = useCallback((p: {x: number, y: number}) => {
        const frac = 1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom)
        const index = Math.round(frac * numUnits - 0.5)
        if ((0 <= index) && (index < numUnits)) {
            return plots[index].unitId
        }
        else return undefined
    }, [canvasHeight, plots, margins, numUnits])

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        const boundingRect = e.currentTarget.getBoundingClientRect()
        const p = {x: e.clientX - boundingRect.x, y: e.clientY - boundingRect.y}
        const unitId = pixelToUnitId(p)
        if ((e.shiftKey) || (e.ctrlKey)) {
            unitIdSelectionDispatch({type: 'TOGGLE_UNIT', targetUnit: unitId})
        }
        else {
            unitIdSelectionDispatch({type: 'UNIQUE_SELECT', targetUnit: unitId})
        }
    }, [pixelToUnitId, unitIdSelectionDispatch])

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const boundingRect = e.currentTarget.getBoundingClientRect()
        const p = {x: e.clientX - boundingRect.x, y: e.clientY - boundingRect.y}
        const unitId = pixelToUnitId(p)
        if (unitId !== undefined) {
            setHoveredUnitId(unitId)
        }
    }, [pixelToUnitId])

    const handleMouseOut = useCallback((e: React.MouseEvent) => {
        setHoveredUnitId(undefined)
    }, [])

    if (visibleStartTimeSec === undefined) {
        return <div>Loading...</div>
    }
    return (
        <TimeScrollView2
            width={width}
            height={height}
            onCanvasElement={setCanvasElement}
            gridlineOpts={gridlineOpts}
            onKeyDown={handleKeyDown}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseOut={handleMouseOut}
            hideToolbar={hideToolbar}
            yAxisInfo={yAxisInfo}
        />
    )
}

export default RasterPlotView2