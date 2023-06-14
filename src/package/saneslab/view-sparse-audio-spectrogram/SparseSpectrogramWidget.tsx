import { FunctionComponent, useCallback, useEffect, useMemo } from "react";
import { DefaultToolbarWidth, TimeScrollView, TimeScrollViewPanel, usePanelDimensions, useTimeseriesMargins } from "../../component-time-scroll-view";
import { useTimeRange, useTimeseriesSelectionInitialization } from "../../context-timeseries-selection";

type Props ={
	width: number
	height: number
	sparseSpectrogram: {
		numFrequencies: number
		numTimepoints: number
		data: {indices: number[], values: number[]}[]
		samplingFrequency: number
	}
	hideToolbar?: boolean
}

const panelSpacing = 4
type PanelProps = {
	// none
}

const SparseSpectrogramWidget: FunctionComponent<Props> = ({width, height, sparseSpectrogram, hideToolbar}) => {
	const {numFrequencies, numTimepoints, data, samplingFrequency} = sparseSpectrogram
	useTimeseriesSelectionInitialization(0, numTimepoints / samplingFrequency)
    const {visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange} = useTimeRange()

	const timeseriesLayoutOpts = useMemo(() => ({hideToolbar, hideTimeAxis: undefined}), [hideToolbar])

	useEffect(() => {
		setVisibleTimeRange(0, Math.min(numTimepoints / samplingFrequency, 120))
	}, [numTimepoints, samplingFrequency, setVisibleTimeRange])

	const margins = useTimeseriesMargins(timeseriesLayoutOpts)
	const panelCount = 1
    const toolbarWidth = timeseriesLayoutOpts?.hideTimeAxis ? 0 : DefaultToolbarWidth
    const { panelWidth, panelHeight } = usePanelDimensions(width - toolbarWidth, height, panelCount, panelSpacing, margins)

	const paintPanel = useCallback((context: CanvasRenderingContext2D, props: PanelProps) => {
		if (visibleStartTimeSec === undefined) return
		if (visibleEndTimeSec === undefined) return
		context.clearRect(0, 0, panelWidth, panelHeight)

		const i1 = Math.floor(visibleStartTimeSec * samplingFrequency) - 1
		const i2 = Math.floor(visibleEndTimeSec * samplingFrequency) + 1
		const p1 = (i1 / samplingFrequency - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)
		const p2 = (i2 / samplingFrequency - visibleStartTimeSec) / (visibleEndTimeSec - visibleStartTimeSec)

		const rect = {
			x: p1 * panelWidth,
			y: 50,
			w: (p2 - p1) * panelWidth,
			h: panelHeight - 100
		}

		const w0 = Math.max(1 / (i2 - i1) * rect.w, 1)
		const h0 = 1 / numFrequencies * rect.h
		for (let i = Math.max(i1, 0); i <= Math.min(i2, numTimepoints - 1); i++) {
			const indices = data[i].indices
			const values = data[i].values
			const x0 = rect.x + (i - i1) / (i2 - i1) * rect.w
			for (let j = 0; j < indices.length; j++) {
				const y0 = rect.y + (1 - indices[j] / numFrequencies) * rect.h
				const c = colorForSpectrogramValue(values[j])
				context.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${c[3]/256})`
				context.fillRect(x0, y0, w0, h0)
			}
		}
	}, [data, numFrequencies, numTimepoints, visibleStartTimeSec, visibleEndTimeSec, samplingFrequency, panelWidth, panelHeight])
	const panels: TimeScrollViewPanel<PanelProps>[] = useMemo(() => {
        return [{
            key: `spectrogram`,
            label: ``,
            props: {} as PanelProps,
            paint: paintPanel
        }]
    }, [paintPanel])
	return (
		<TimeScrollView
			margins={margins}
			panels={panels}
			panelSpacing={panelSpacing}
			timeseriesLayoutOpts={timeseriesLayoutOpts}
			width={width}
			height={height}
		/>
	)
}

const colorForSpectrogramValue = (v: number) => {
	return v > 0 ? [0, 0, 0, v * 10] : [0, 0, 0, 0]
}

export default SparseSpectrogramWidget
