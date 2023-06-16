import colormap from 'colormap';
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import deserializeReturnValue from '../deserializeReturnValue';
import TimeScrollView2, { useTimeScrollView2 } from "../package/component-time-scroll-view-2/TimeScrollView2";
import { useTimeRange, useTimeseriesSelectionInitialization } from "../package/context-timeseries-selection";
import { useRtcshare } from "../rtcshare/useRtcshare";
import { isTimeseriesAnnotationFileData, TimeseriesAnnotationFileData } from '../TimeseriesAnnotation/TimeseriesAnnotationFileData';
import SpectrogramClient from "./SpectrogramClient";

type Props ={
	width: number
	height: number
	spectrogramUri: string
	annotationFilePath?: string
}

const SpectrogramWidget: FunctionComponent<Props> = ({width, height, spectrogramUri, annotationFilePath}) => {
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

	const [annotationText, setAnnotationText] = useState<string | undefined>(undefined)

    const {client} = useRtcshare()

    useEffect(() => {
        let canceled = false
        if (!client) return
        if (!annotationFilePath) return
        ; (async () => {
            const buf = await client.readFile(annotationFilePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setAnnotationText(txt)
        })()
        return () => {canceled = true}
    }, [client, annotationFilePath])

    const [annotationFileData, setAnnotationFileData] = useState<TimeseriesAnnotationFileData | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!annotationText) return
        ; (async () => {
            if ((annotationFilePath) && (annotationText)) {
                const dAnnotation = await deserializeReturnValue(JSON.parse(annotationText))
                if (canceled) return
                if (!isTimeseriesAnnotationFileData(dAnnotation)) {
                    console.warn(dAnnotation)
                    console.warn('Invalid timeseries annotation file data')
                    return
                }
                setAnnotationFileData(dAnnotation)
            }
        })()
        return () => {canceled = true}
    }, [annotationText, annotationFilePath])

	if (!spectrogramClient) return <div>Loading spectrogram client</div>
	return (
		<SpectrogramWidgetChild
			width={width}
			height={height}
			spectrogramClient={spectrogramClient}
			annotationData={annotationFileData}
		/>
	)
}

type ChildProps = {
	width: number
	height: number
	spectrogramClient: SpectrogramClient
	annotationData?: TimeseriesAnnotationFileData
}

const gridlineOpts = {
	hideX: false,
	hideY: true
}

const SpectrogramWidgetChild: FunctionComponent<ChildProps> = ({width, height, spectrogramClient, annotationData}) => {
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

    const hideToolbar = false
    const bottomToolbarHeight = 20
	const {canvasWidth, canvasHeight, margins, toolbarWidth} = useTimeScrollView2({width, height: height - bottomToolbarHeight, hideToolbar})
    const panelWidth = canvasWidth - margins.left - margins.right
	const panelHeight = canvasHeight - margins.top - margins.bottom

    const [brightnessLevel, setBrightnessLevel] = useState(0)

	useEffect(() => {
		if (visibleStartTimeSec === undefined) return undefined
		if (visibleEndTimeSec === undefined) return undefined

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
					let val: number = vals[ff]
                    val *= Math.pow(2, brightnessLevel / 30)
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

        const topMargin = 3
        const bottomMargin = 3

		const rect = {
			x: margins.left + p1 * panelWidth,
			y: margins.top + topMargin,
			w: (p2 - p1) * panelWidth,
            h: panelHeight - topMargin - bottomMargin
			//h: canvasHeight - margins.top - margins.bottom - bottomMargin - topMargin
		}

		context.drawImage(offscreenCanvas, rect.x, rect.y, rect.w, rect.h)

		if (annotationData) {
			drawAnnotation({
				canvasContext: context,
				canvasWidth: canvasWidth,
				canvasHeight: canvasHeight,
				visibleStartTimeSec: visibleStartTimeSec,
				visibleEndTimeSec: visibleEndTimeSec,
				margins: margins,
				annotation: annotationData
			})
		}
		
    }, [spectrogramClient, samplingFrequency, visibleStartTimeSec, visibleEndTimeSec, canvasWidth, refreshCode, canvasElement, canvasHeight, width, height, margins, annotationData, panelWidth, panelHeight, brightnessLevel])
	
	const yAxisInfo = useMemo(() => ({
        showTicks: false,
        yMin: 0,
        yMax: 1
    }), [])

	return (
        <div style={{position: 'absolute', width: width, height: height}}>
            <TimeScrollView2
                onCanvasElement={elmt => setCanvasElement(elmt)}
                gridlineOpts={gridlineOpts}
                // onKeyDown={handleKeyDown}
                width={width}
                height={height - bottomToolbarHeight}
                yAxisInfo={yAxisInfo}
                hideToolbar={hideToolbar}
            />
            <div style={{position: 'absolute', left: toolbarWidth, top: height - bottomToolbarHeight, width: width - toolbarWidth, height: bottomToolbarHeight, backgroundColor: '#eee', color: 'white', fontSize: 12}}>
                <BrightnessSlider value={brightnessLevel} setValue={setBrightnessLevel} min={-100} max={100} />
            </div>
        </div>
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
    colormap: 'magma',
    nshades: 100,
    format: 'float',
    alpha: 1
})

const scale = 50

function colorForSpectrogramValue(v: number) {
	if (isNaN(v)) return [0, 0, 0, 0]
	const v2 = Math.min(99, Math.max(0, Math.floor(v / 255 * 100 * scale)))
	// if (!v2) return [0, 0, 0, 0]
	const ret = colors[v2]
	return ret.map(v => (Math.floor(v * 255)))
}

type BrightnessSliderProps = {
    value: number
    setValue: (value: number) => void
    min: number
    max: number
}

const BrightnessSlider: FunctionComponent<BrightnessSliderProps> = ({value, setValue, min, max}) => {
    return (
        <div title="Brightness">
            <input type="range" min={min} max={max} value={value} onChange={evt => setValue(Number(evt.target.value))} style={{maxHeight: 20}} />
        </div>
    )
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////
// BEGIN drawAnnotation
///////////////////////////////////////////////////////////////////////////////////////////////////////////
let drawAnnotationDrawCode = 0

const drawAnnotation = async (o: {
    canvasContext: CanvasRenderingContext2D
    canvasWidth: number
    canvasHeight: number
    visibleStartTimeSec: number
    visibleEndTimeSec: number
    margins: {left: number, right: number, top: number, bottom: number}
    annotation: TimeseriesAnnotationFileData
}) => {
    drawAnnotationDrawCode += 1
    const thisDrawAnnotationDrawCode = drawAnnotationDrawCode

    const {canvasContext, canvasWidth, canvasHeight, visibleStartTimeSec, visibleEndTimeSec, margins, annotation} = o

    const {events, event_types} = annotation

    const eventsFiltered = events.filter(e => (e.s <= visibleEndTimeSec) && (e.e >= visibleStartTimeSec))

    const colors = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
        [255, 255, 0],
        [255, 0, 255],
        [0, 255, 255],
        [255, 128, 0],
        [255, 0, 128],
        [128, 255, 0],
        [0, 255, 128],
        [128, 0, 255],
        [0, 128, 255]
    ] as [number, number, number][]
    const colorsForEventTypes: {[key: string]: [number, number, number]} = {}
    for (const et of event_types) {
        const color = colors[et.color_index % colors.length]
        colorsForEventTypes[et.event_type] = color
    }

    let timer = Date.now()
    for (const pass of ['rect', 'line']) {
        for (const e of eventsFiltered) {
            if (thisDrawAnnotationDrawCode !== drawAnnotationDrawCode) return
            
            const color = colorsForEventTypes[e.t]
            if (e.e > e.s) {
                if (pass !== 'rect') continue
                const R = {
                    x: margins.left + (e.s - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    y: margins.top,
                    w: (e.e - e.s) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    h: canvasHeight - margins.top - margins.bottom
                }
                canvasContext.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},0.3)`
                canvasContext.fillRect(R.x, R.y, R.w, R.h)
                const elapsed = Date.now() - timer
                if (elapsed > 100) {
                    await sleepMsec(elapsed)
                    timer = Date.now()
                }
            }
            else {
                if (pass !== 'line') continue
                const pt1 = {
                    x: margins.left + (e.s - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec) * (canvasWidth - margins.left - margins.right),
                    y: margins.top
                }
                const pt2 = {
                    x: pt1.x,
                    y: canvasHeight - margins.bottom
                }
                canvasContext.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},1)`
                canvasContext.beginPath()
                canvasContext.moveTo(pt1.x, pt1.y)
                canvasContext.lineTo(pt2.x, pt2.y)
                canvasContext.stroke()
            }
        }
    }
    function sleepMsec(msec: number) {
        return new Promise((resolve) => {
            setTimeout(resolve, msec)
        })
    }
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////
// END drawAnnotation
///////////////////////////////////////////////////////////////////////////////////////////////////////////

export default SpectrogramWidget
