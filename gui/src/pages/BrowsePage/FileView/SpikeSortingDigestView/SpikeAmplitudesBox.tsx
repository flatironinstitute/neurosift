import { FunctionComponent, useEffect, useMemo, useState } from "react"
import TimeScrollView2, { useTimeScrollView2 } from "../../../../package/component-time-scroll-view-2/TimeScrollView2"
import { useTimeRange, useTimeseriesSelectionInitialization } from "../../../../package/context-timeseries-selection"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import ZarrArrayClient from "../../../zarr/ZarrArrayClient"
import IfHasBeenVisible from "./IfHasBeenVisible"

type Props = {
    width: number
    height: number
    path: string
    unitId: number | string
    samplingFrequency: number
    color?: string
}

export const SpikeAmplitudesBox: FunctionComponent<Props> = ({width, height, path, unitId, samplingFrequency, color}) => {
    return (
        <IfHasBeenVisible
            width={width}
            height={height}
        >
            <SpikeAmplitudesBoxChild
                width={width}
                height={height}
                path={path}
                unitId={unitId}
                samplingFrequency={samplingFrequency}
                color={color}
            />
        </IfHasBeenVisible>
    )
}

const useSubsampledSpikeAmplitudes = (path: string, unitId: number | string, samplingFrequency: number) => {
    const unitFolder = `${path}/units/${unitId}`
    const zarrPath = `${unitFolder}/data.zarr`
    const [subsampledSpikeTimes, setSubsampledSpikeTimes] = useState<number[] | undefined>(undefined)
    const [subsampledSpikeAmplitudes, setSubsampledSpikeAmplitudes] = useState<number[] | undefined>(undefined)
    const {client: rtcshareClient} = useRtcshare()
    
    useEffect(() => {
        if (!rtcshareClient) return
        let canceled = false
        ; (async () => {
            const zarrUri = `rtcshare://${zarrPath}`
            const c1 = new ZarrArrayClient(zarrUri, 'subsampled_spike_amplitudes', rtcshareClient)
            const sAmps = await c1.getArray1D()
            if (canceled) return
            const c2 = new ZarrArrayClient(zarrUri, 'subsampled_spike_times', rtcshareClient)
            const sTimes = await c2.getArray1D()
            if (canceled) return
            setSubsampledSpikeTimes(sTimes.map(t => t / samplingFrequency))
            setSubsampledSpikeAmplitudes(sAmps)
        })()
        return () => { canceled = true }
    }, [zarrPath, rtcshareClient, samplingFrequency])
    return {subsampledSpikeTimes, subsampledSpikeAmplitudes}
}

const SpikeAmplitudesBoxChild: FunctionComponent<Props> = ({width, height, path, unitId, samplingFrequency, color}) => {
    const {subsampledSpikeTimes, subsampledSpikeAmplitudes} = useSubsampledSpikeAmplitudes(path, unitId, samplingFrequency)
    if ((!subsampledSpikeTimes) || (!subsampledSpikeAmplitudes)) {
        return <div>...</div>
    }
    return (
        <SpikeAmplitudesPlot
            width={width}
            height={height}
            times={subsampledSpikeTimes}
            amplitudes={subsampledSpikeAmplitudes}
            color={color}
        />
    )
}

type SpikeAmplitudesPlotProps = {
    width: number
    height: number
    times: number[]
    amplitudes: number[]
    color?: string
}

const gridlineOpts = {
	hideX: false,
	hideY: true
}

const SpikeAmplitudesPlot: FunctionComponent<SpikeAmplitudesPlotProps> = ({width, height, times, amplitudes, color}) => {
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()

    useTimeseriesSelectionInitialization(times[0], times[times.length - 1])

    const hideToolbar = false
    const {canvasWidth, canvasHeight, margins, toolbarWidth} = useTimeScrollView2({width, height: height, hideToolbar})
    
    const {minAmp, maxAmp} = useMemo(() => {
        let minAmp = 0
        let maxAmp = 0
        const N = amplitudes.length
        for (let i = 0; i < N; i++) {
            const a = amplitudes[i]
            if (a < minAmp) minAmp = a
            if (a > maxAmp) maxAmp = a
        }
        return {minAmp, maxAmp}
    }, [amplitudes])

    const {visibleStartTimeSec, visibleEndTimeSec} = useTimeRange()

    useEffect(() => {
        if (visibleStartTimeSec === undefined) return
        if (visibleEndTimeSec === undefined) return
        const context = canvasElement?.getContext('2d')
		if (!context) return
		context.clearRect(0, 0, width, height)

        const timeToX = (t: number) => {
            return margins.left + (t - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right)
        }

        const ampToY = (a: number) => {
            return margins.top + (1 - (a - minAmp) / (maxAmp - minAmp)) * (canvasHeight - margins.top - margins.bottom)
        }

        // draw zero line
        context.strokeStyle = color || 'black'
        // dashed
        context.setLineDash([5, 5])
        context.beginPath()
        context.moveTo(0, ampToY(0))
        context.lineTo(width, ampToY(0))
        context.stroke()

        context.fillStyle = color || 'black'
        const N = times.length
        for (let i = 0; i < N; i++) {
            const t = times[i]
            const a = amplitudes[i]
            const x = timeToX(t)
            const y = ampToY(a)
            context.fillRect(x, y, 1, 1)
        }
    }, [canvasElement, width, height, times, amplitudes, visibleStartTimeSec, visibleEndTimeSec, minAmp, maxAmp, color, margins, canvasWidth, canvasHeight])

    const yAxisInfo = useMemo(() => ({
        showTicks: false,
        yMin: 0,
        yMax: 1
    }), [])
    return (
        <TimeScrollView2
            onCanvasElement={elmt => setCanvasElement(elmt)}
            gridlineOpts={gridlineOpts}
            width={width}
            height={height}
            yAxisInfo={yAxisInfo}
            hideToolbar={hideToolbar}
            shiftZoom={true}
        />
    )
}

export default SpikeAmplitudesBox