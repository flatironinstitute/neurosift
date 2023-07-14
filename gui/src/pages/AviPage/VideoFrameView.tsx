import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AffineTransform, identityAffineTransform } from "../../package/AffineTransform";

type Props ={
	src: string
	timeSec: number | undefined
	playbackRate: number
	width: number
	height: number
	affineTransform?: AffineTransform
}

const VideoFrameView: FunctionComponent<Props> = ({src, timeSec, width, height, affineTransform, playbackRate}) => {
	const srcUrl = src
	const [seeking, setSeeking] = useState<boolean>(false)
	const [refreshCode, setRefreshCode] = useState(0)
	const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>(undefined)
	const [overlayCanvasElement, setOverlayCanvasElement] = useState<HTMLCanvasElement | undefined>(undefined)
	const handleDrawVideoFrame = useCallback((v: HTMLVideoElement) => {
		if (!canvasElement) return
		const ctx: CanvasRenderingContext2D | null = canvasElement.getContext('2d')
		if (!ctx) return

		// clearRect causes a flicker
		// ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

		ctx.save()
		const ff = (affineTransform || identityAffineTransform).forward
		ctx.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2])

		const W = v.videoWidth
		const H = v.videoHeight
		const W2 = W * height < H * width ? W * height / H : width
		const H2 = W * height < H * width ? height : H * width / W
		ctx.drawImage(v, (width - W2) / 2, (height - H2) / 2, W2, H2)

		const LARGE = 1000

		// clear everything outside the rect
		ctx.clearRect(-LARGE, -LARGE, LARGE + (width - W2) / 2, LARGE + height)
		ctx.clearRect((width + W2) / 2, -LARGE, LARGE + (width - W2) / 2, LARGE + height)
		ctx.clearRect(-LARGE, -LARGE, LARGE + width, LARGE + (height - H2) / 2)
		ctx.clearRect(-LARGE, (height + H2) / 2, LARGE + width, LARGE + (height - H2) / 2)
		
		ctx.restore()
	}, [width, height, affineTransform, canvasElement])
	useEffect(() => {
		let canceled = false
		setTimeout(() => { // wait half a second before we decide to display loading
			if (canceled) return
			if (!overlayCanvasElement) return
			const ctx: CanvasRenderingContext2D | null = overlayCanvasElement.getContext('2d')
			if (!ctx) return
			ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
			if (seeking) {
				ctx.strokeStyle = 'magenta'
				ctx.strokeText('Loading...', 20, 20)
			}
		}, seeking ? 500 : 0)
		return () => {canceled = true}
	}, [seeking, overlayCanvasElement])
	const video = useMemo(() => {
		if (!srcUrl) return undefined
		const v = document.createElement('video')
		v.addEventListener('seeked', (a) => {
			setSeeking(false)
			setRefreshCode(c => (c + 1))
		})
		v.src = srcUrl
		return v
	}, [srcUrl])
	useEffect(() => {
		video && handleDrawVideoFrame(video)
	}, [video, seeking, refreshCode, handleDrawVideoFrame])
	useEffect(() => {
		if (!video) return
		video.playbackRate = playbackRate
	}, [playbackRate, video])
	useEffect(() => {
		if (!video) return
		if (timeSec !== undefined) {
			setSeeking(true)
			video.currentTime = timeSec || 0.0001 // for some reason it doesn't like currentTime=0 for initial display
		}
	}, [video, timeSec])
	useEffect(() => {
		if (!video) return
		video.pause()
		// video.play()
		let canceled = false
		function drawIt() {
			if (canceled) return
			if (!video) return
			video && handleDrawVideoFrame(video)
			// setTimeout(() => {
			// 	drawIt()
			// 	if (video) {
			// 		setTimeSec(video.currentTime)
			// 	}
			// }, 30)
		}
		drawIt()
		return () => {canceled = true}
	}, [handleDrawVideoFrame, video])
	return (
		<div style={{position: 'absolute', width, height}}>
			<div style={{position: 'absolute', width, height}}>
				<canvas
					ref={elmt => elmt && setCanvasElement(elmt)}
					width={width}
					height={height}
				/>
			</div>
			<div style={{position: 'absolute', width, height}}>
				<canvas
					ref={elmt => elmt && setOverlayCanvasElement(elmt)}
					width={width}
					height={height}
				/>
			</div>
		</div>
	)
}

export default VideoFrameView
