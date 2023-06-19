import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useRtcshare } from "../../../../rtcshare/useRtcshare";
import { AffineTransform } from "./AffineTransform";
import PositionDecodeFieldClient, { PositionDecodeFieldFrame, PositionDecodeFieldHeader } from "./PositionDecodeFieldClient";

type Props ={
	positionDecodeFieldUri: string
	timeSec: number | undefined
	samplingFrequency: number
	width: number
	height: number
	affineTransform: AffineTransform
	scale: [number, number]
}

const PositionDecodeFieldFrameView: FunctionComponent<Props> = ({positionDecodeFieldUri, timeSec, width, height, affineTransform, samplingFrequency, scale}) => {
	const {client: rtcshareClient} = useRtcshare()
	const positionDecodeFieldClient = useMemo(() => {
		if (!rtcshareClient) return undefined
		return new PositionDecodeFieldClient(positionDecodeFieldUri, rtcshareClient)
	}, [positionDecodeFieldUri, rtcshareClient])
	const [positionDecodeFrame, setPositionDecodeFieldFrame] = useState<PositionDecodeFieldFrame | undefined>()
	const [positionDecodeHeader, setPositionDecodeFieldHeader] = useState<PositionDecodeFieldHeader | undefined>()
	useEffect(() => {
		positionDecodeFieldClient?.getHeader().then(h => {
			setPositionDecodeFieldHeader(h)
		})
	}, [positionDecodeFieldClient])
	useEffect(() => {
		setPositionDecodeFieldFrame(undefined)
		if (timeSec === undefined) return
		if (!positionDecodeFieldClient) return
		const frameIndex = Math.round(timeSec * samplingFrequency)
		if (frameIndex < 0) return
		let canceled = false
		positionDecodeFieldClient.getFrame(frameIndex).then(f => {
			if (canceled) return
			setPositionDecodeFieldFrame(f)
		})
		return () => {canceled = true}
	}, [positionDecodeFieldClient, timeSec, samplingFrequency])

	const canvasRef = useRef<any>(null)
	useEffect(() => {
		const ctxt: CanvasRenderingContext2D | undefined = canvasRef.current?.getContext('2d')
		if (!ctxt) return

		ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height)

		ctxt.save()
		const ff = affineTransform.forward
		ctxt.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2])

		const header = positionDecodeHeader
		if (!header) return

		const alpha = 0.7

		const frame = positionDecodeFrame
		const usedIndices = new Set<number>()
		if (frame) {
			for (let i = 0; i < frame.indices.length; i++) {
				usedIndices.add(frame.indices[i])
				const index = frame.indices[i]
				const bin = header.bins[index]

				const value = frame.values[i]
				const c = colorForValue(value / header.max_value, alpha)
				ctxt.fillStyle = c
				ctxt.fillRect(bin.x * scale[0], bin.y * scale[1], bin.w * scale[0] + 1, bin.h * scale[1] + 1)
			}
		}

		ctxt.fillStyle = `rgba(0,0,255,${alpha})`
		for (let i = 0; i < header.bins.length; i++) {
			const bin = header.bins[i]
			if (usedIndices.has(i)) continue
			ctxt.fillRect(bin.x * scale[0], bin.y * scale[1], bin.w * scale[0] + 1, bin.h * scale[1] + 1)
		}
		
		ctxt.restore()
	}, [affineTransform, positionDecodeFieldClient, timeSec, positionDecodeFrame, positionDecodeHeader, scale])
	return (
		<div style={{position: 'absolute', width, height}}>
			<canvas
				ref={canvasRef}
				width={width}
				height={height}
			/>
		</div>
	)
}

const colorForValue = (v: number, alpha: number) => {
	const g = Math.floor(v * 255)
	return `rgba(${g},${g},${g},${alpha})`
}

export default PositionDecodeFieldFrameView
