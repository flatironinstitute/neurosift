import validateObject, { isEqualTo, isString, isArrayOf, isOneOf, isNumber } from '../../../types/validateObject'
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react'
import TimeScrollView2, { useTimeScrollView2 } from '../../component-time-scroll-view-2/TimeScrollView2'
import { useTimeRange, useTimeseriesSelectionInitialization } from '../../context-timeseries-selection'
import { idToNum, useSelectedUnitIds } from '../../context-unit-selection'
import { RasterPlotView3Data } from './RasterPlotView3Data'
import { Opts, Plot, PlotData } from './WorkerTypes'
import { colorForUnitId } from '../unit-colors'

type Props = {
    data: RasterPlotView3Data
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

type SpikeTrainsAttributes = {
    type: 'neurosift.SpikeTrains'
    version: '1'
    start_time: number
    end_time: number
    total_num_spikes: number
    units: {
        unit_id: string | number
        num_spikes: number
    }[]
    blocks: {
        start_time: number
        end_time: number
    }[]
}

const isSpikeTrainsAttributes = (x: any): x is SpikeTrainsAttributes => {
    return validateObject(x, {
        type: isEqualTo('neurosift.SpikeTrains'),
        version: isEqualTo('1'),
        start_time: isNumber,
        end_time: isNumber,
        total_num_spikes: isNumber,
        units: isArrayOf(y => (validateObject(y, {
            unit_id: isOneOf([isString, isNumber]),
            num_spikes: isNumber
        }, {allowAdditionalFields: true}))),
        blocks: isArrayOf(y => (validateObject(y, {
            start_time: isNumber,
            end_time: isNumber
        }, {allowAdditionalFields: true})))
    }, {allowAdditionalFields: true})
}

type BlockAttributes = {
    start_time: number
    end_time: number
    total_num_spikes: number
    units: {
        unit_id: string | number
        num_spikes: number
    }[]
}

const isBlockAttributes = (x: any): x is BlockAttributes => {
    return validateObject(x, {
        start_time: isNumber,
        end_time: isNumber,
        total_num_spikes: isNumber,
        units: isArrayOf(y => (validateObject(y, {
            unit_id: isOneOf([isString, isNumber]),
            num_spikes: isNumber
        }, {allowAdditionalFields: true})))
    }, {allowAdditionalFields: true})
}

const useSpikeTrains = (spike_trains_uri: string) => {
    const [spikeTrainsAttributes, setSpikeTrainsAttributes] = useState<SpikeTrainsAttributes | undefined>(undefined)

    const [plots, setPlots] = useState<Plot[] | undefined>()

    useEffect(() => {
        (async () => {
            // todo!!
            // const spikeTrainsAttributes = await getFileData(`${spike_trains_uri}/.zattrs`, () => {}, {responseType: 'json'})
            // if (!isSpikeTrainsAttributes(spikeTrainsAttributes)) {
            //     console.warn(spikeTrainsAttributes)
            //     throw Error('Unexpected spike trains attributes')
            // }
            // setSpikeTrainsAttributes(spikeTrainsAttributes)
        })()
    }, [spike_trains_uri])

    const timeRange = useMemo(() => {
        if (!spikeTrainsAttributes) return undefined
        return {
            startTimeSec: spikeTrainsAttributes.start_time,
            endTimeSec: spikeTrainsAttributes.end_time
        }
    }, [spikeTrainsAttributes])

    useEffect(() => {
        let canceled = false
        const timer = Date.now()
        ;(async () => {
            // todo!!
            // if (!spikeTrainsAttributes) return

            // const spikeTimesList: (Float32Array[])[] = spikeTrainsAttributes.units.map(u => ([]))

            // for (let i = 0; i < spikeTrainsAttributes.blocks.length; i ++) {
            //     const blockAttributes = await getFileData(`${spike_trains_uri}/blocks/${i}/.zattrs`, () => {}, {responseType: 'json'})
            //     if (!isBlockAttributes(blockAttributes)) {
            //         console.warn(blockAttributes)
            //         throw Error('Unexpected block attributes')
            //     }
            //     if (canceled) return
            //     const query = {
            //         type: 'get_array_chunk',
            //         path: spike_trains_uri,
            //         name: `blocks/${i}/spike_trains`,
            //         slices: [{start: 0, stop: blockAttributes.total_num_spikes, step: 1}]
            //     }
            //     const {result, binaryPayload} = await serviceQuery(`zarr`, query)
            //     if (canceled) return
            //     if (!result.success) {
            //         throw Error(`Error in service query: ${result.error}`)
            //     }
            //     if (result.dtype !== 'float32') {
            //         throw Error(`Unexpected dtype: ${result.dtype}`)
            //     }
            //     console.info(`Loaded block ${i} in ${Date.now() - timer} ms`)
            //     const spikeTimesSec = new Float32Array(binaryPayload)
            //     let position = 0
            //     for (let i = 0; i < blockAttributes.units.length; i ++) {
            //         const unit = blockAttributes.units[i]
            //         const {num_spikes} = unit
            //         const spikeTimes = spikeTimesSec.slice(position, position + num_spikes)
            //         spikeTimesList[i].push(spikeTimes)
            //         position += num_spikes
            //     }
            // }

            // const plots0: Plot[] = []
            // for (let i = 0; i < spikeTrainsAttributes.units.length; i ++) {
            //     const stList = spikeTimesList[i]
            //     // concatenate these float32arrays
            //     const numSpikes = stList.reduce((sum, x) => (sum + x.length), 0)
            //     const spikeTimesSec = new Float32Array(numSpikes)
            //     let position = 0
            //     for (const st of stList) {
            //         spikeTimesSec.set(st, position)
            //         position += st.length
            //     }
            //     plots0.push({
            //         unitId: spikeTrainsAttributes.units[i].unit_id,
            //         spikeTimesSec: spikeTimesSec,
            //         color: 'black' // assigned below
            //     })
            // }
            // setPlots(plots0)
        })()
        return () => {canceled = true}
    }, [spikeTrainsAttributes, spike_trains_uri])

    const hideToolbar = false
    return {
        startTimeSec: timeRange?.startTimeSec,
        endTimeSec: timeRange?.endTimeSec,
        plots,
        hideToolbar
    }
}

const RasterPlotView3: FunctionComponent<Props> = ({data, width, height}) => {
    const {spike_trains_uri} = data

    const {startTimeSec, endTimeSec, plots, hideToolbar} = useSpikeTrains(spike_trains_uri)

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
            plots: (plots || []).map(p => ({
                ...p,
                color: colorForUnitId(idToNum(p.unitId))
            }))
        }
        return ret
    }, [plots])

    useEffect(() => {
        if (!worker) return
        worker.postMessage({
            plotData
        })
    }, [plotData, worker])

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

    const numUnits = (plots || []).length

    const pixelToUnitId = useCallback((p: {x: number, y: number}) => {
        const frac = 1 - (p.y - margins.top) / (canvasHeight - margins.top - margins.bottom)
        const index = Math.round(frac * numUnits - 0.5)
        if ((0 <= index) && (index < numUnits)) {
            return (plots || [])[index].unitId
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

export default RasterPlotView3