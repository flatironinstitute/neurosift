import colormap from 'colormap';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { DefaultToolbarWidth, usePanelDimensions, useTimeseriesMargins } from "../package/component-time-scroll-view";
import TimeScrollView2, { useTimeScrollView2 } from "../package/component-time-scroll-view-2/TimeScrollView2";
import { useTimeRange, useTimeseriesSelectionInitialization } from "../package/context-timeseries-selection";
import { useRtcshare } from "../rtcshare/useRtcshare";
import SpectrogramClient from "./SpectrogramClient";

type Props ={
	width: number
	height: number
	spectrogramUri: string
}

const timeseriesLayoutOpts: any = {}
const panelSpacing = 4
type PanelProps = {
	// none
}

const SpectrogramWidget: FunctionComponent<Props> = ({width, height, spectrogramUri}) => {
	const [spectrogramClient, setSpectrogramClient] = useState<SpectrogramClient>()
	const {client: rtcshareClient} = useRtcshare()
	useEffect(() => {
		if (!spectrogramUri) return
		if (!rtcshareClient) return
		const spectrogramClient = new SpectrogramClient(spectrogramUri, rtcshareClient)
		spectrogramClient.initialize().then(() => {
			setSpectrogramClient(spectrogramClient)
		})
	}, [spectrogramUri, rtcshareClient])
	if (!spectrogramClient) return <div>Loading spectrogram client</div>
	return (
		<SpectrogramWidgetChild
			width={width}
			height={height}
			spectrogramClient={spectrogramClient}
		/>
	)
}

type ChildProps = {
	width: number
	height: number
	spectrogramClient: SpectrogramClient
}

const gridlineOpts = {
	hideX: false,
	hideY: true
}

const SpectrogramWidgetChild: FunctionComponent<ChildProps> = ({width, height, spectrogramClient}) => {
	const numTimepoints = spectrogramClient.numTimepoints
	const samplingFrequency = spectrogramClient.samplingFrequency
	useTimeseriesSelectionInitialization(0, numTimepoints / samplingFrequency)
    const {visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange} = useTimeRange()
	const [refreshCode, setRefreshCode] = useState(0)

	const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>()

	useEffect(() => {
		setVisibleTimeRange(0, Math.min(numTimepoints / samplingFrequency, 20))
	}, [numTimepoints, samplingFrequency, setVisibleTimeRange])

	useEffect(() => {
		spectrogramClient.onDataRecieved(() => {
			setRefreshCode(c => c + 1)
		})
	}, [spectrogramClient])

	const {canvasWidth, canvasHeight, margins} = useTimeScrollView2({width, height})

	useEffect(() => {
		if (visibleStartTimeSec === undefined) return undefined
		if (visibleEndTimeSec === undefined) return undefined

		const panelWidth = canvasWidth - margins.left - margins.right
		const panelHeight = canvasHeight - margins.top - margins.bottom

		const i1 = Math.floor(visibleStartTimeSec * samplingFrequency) - 1
		const i2 = Math.floor(visibleEndTimeSec * samplingFrequency) + 1
		const downsampleFactor = determinePower3DownsampleFactor(i2 - i1, panelWidth)

		const i1_ds = Math.floor(i1 / downsampleFactor)
		const i2_ds = Math.ceil(i2 / downsampleFactor)

		const nT_ds = i2_ds - i1_ds
		if (!nT_ds) return undefined
		
		const data: number[] = []
		const nF = spectrogramClient.numFrequencies

		// preallocate data
		for (let ff = 0; ff < nF; ff++) {
			for (let it = 0; it < nT_ds; it++) {
				data.push(...[0, 0, 0, 0])
			}
		}

		for (let it = 0; it < nT_ds; it++) {
			const t = i1_ds + it
			const vals = spectrogramClient.getValues(downsampleFactor, t)
			if (vals) {
				for (let ff = 0; ff < nF; ff++) {
					const val: number = vals[ff]
					const c = colorForSpectrogramValue(val)
					const ind = (nF - 1 - ff) * nT_ds + it
					data[ind * 4 + 0] = c[0]
					data[ind * 4 + 1] = c[1]
					data[ind * 4 + 2] = c[2]
					data[ind * 4 + 3] = c[3]
				}
			}
		}

		const clampedData = Uint8ClampedArray.from(data)
		const imageData = new ImageData(clampedData, nT_ds, nF)

		const context = canvasElement?.getContext('2d')
		if (!context) return
		context.clearRect(0, 0, width, height)
		const offscreenCanvas = document.createElement('canvas')
		offscreenCanvas.width = imageData.width
		offscreenCanvas.height = imageData.height
		const c = offscreenCanvas.getContext('2d')
		if (!c) return
		c.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height)
		c.putImageData(imageData, 0, 0)

		const p1 = (i1 / samplingFrequency - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)
		const p2 = (i2 / samplingFrequency - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)

		const rect = {
			x: margins.left + p1 * panelWidth,
			y: margins.bottom + 50,
			w: (p2 - p1) * panelWidth,
			h: panelHeight - 100
		}

		context.drawImage(offscreenCanvas, rect.x, rect.y, rect.w, rect.h)
		
    }, [spectrogramClient, samplingFrequency, visibleStartTimeSec, visibleEndTimeSec, canvasWidth, refreshCode, canvasElement, canvasHeight, width, height, margins])
	
	const yAxisInfo = useMemo(() => ({
        showTicks: false,
        yMin: 0,
        yMax: 1
    }), [])

	return (
		<TimeScrollView2
            onCanvasElement={elmt => setCanvasElement(elmt)}
            gridlineOpts={gridlineOpts}
            // onKeyDown={handleKeyDown}
            width={width}
            height={height}
            yAxisInfo={yAxisInfo}
            hideToolbar={false}
        />
	)
}

const determinePower3DownsampleFactor = (n: number, target: number) => {
	let factor = 1
	while (n / (factor * 3) > target) {
		factor *= 3
	}
	return factor
}

const colors = colormap({
    colormap: 'bone',
    nshades: 100,
    format: 'float',
    alpha: 1
})

const scale = 50

function colorForSpectrogramValue(v: number) {
	if (isNaN(v)) return [0, 0, 0, 0]
	const v2 = Math.min(99, Math.max(0, Math.floor(v / 255 * 100 * scale)))
	if (!v2) return [0, 0, 0, 0]
	const ret = colors[99 - v2]
	return ret.map(v => (Math.floor(v * 255)))
}

export default SpectrogramWidget
