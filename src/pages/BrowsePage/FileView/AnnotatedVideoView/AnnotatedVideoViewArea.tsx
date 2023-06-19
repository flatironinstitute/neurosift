import { PlayArrow, Stop } from "@mui/icons-material";
import { Checkbox, createTheme, FormControl, FormControlLabel, IconButton, MenuItem, Select, SelectChangeEvent, Slider, ThemeProvider } from "@mui/material";
import { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRtcshare } from "../../../../rtcshare/useRtcshare";
import { getNodeColor } from "./getNodeColor";
import PositionDecodeFieldFrameView from "./PositionDecodeFieldFrameView";
import useWheelZoom from "./useWheelZoom";
import VideoAnnotationClient, { VideoAnnotationNode } from "./VideoAnnotationClient";
import VideoAnnotationFrameView from "./VideoAnnotationFrameView";
import VideoClient from "./VideoView/VideoClient";
import VideoViewCanvas from "./VideoView/VideoViewCanvas";


type Props ={
	width: number
	height: number
	currentTime: number
	setCurrentTime: (t: number) => void
	videoUri?: string
	annotationUri?: string
	positionDecodeFieldUri?: string
	videoWidth: number
	videoHeight: number
	samplingFrequency: number
	frameCount: number
	onSelectRect?: (r: {x: number, y: number, w: number, h: number}) => void
}

const theme = createTheme({
	components: {
		MuiSlider: {
			styleOverrides: {
				root: {
					paddingTop: 25,
					marginLeft: 10
				}	
			}
		}
	}
});

const AnnotatedVideoViewArea: FunctionComponent<Props> = ({width, height, currentTime, setCurrentTime, videoUri, annotationUri, positionDecodeFieldUri, videoWidth, videoHeight, samplingFrequency, frameCount}) => {
	const bottomBarHeight = 40

	const [showAnnotations, setShowAnnotations] = useState(true)
	const [showPositionDecodeField, setShowPositionDecodeField] = useState(true)
	const [showVideo, setShowVideo] = useState(true)

	const {client: rtcshareClient} = useRtcshare()

	const [annotationClient, setAnnotationClient] = useState<VideoAnnotationClient | undefined>(undefined)
	useEffect(() => {
		let canceled = false
		if (!annotationUri) return
		if (!rtcshareClient) return
		;(async () => {
			const client = new VideoAnnotationClient(annotationUri, rtcshareClient)
			await client.initialize()
			if (canceled) return
			setAnnotationClient(client)
		})()
		return () => {canceled = true}
	}, [annotationUri, rtcshareClient])

	const [nodes, setNodes] = useState<VideoAnnotationNode[] | undefined>(undefined)

	useEffect(() => {
		if (!annotationClient) return
		let canceled = false
		;(async () => {
			const nodes = await annotationClient.getNodes()
			if (canceled) return
			setNodes(nodes)
		})()
		return () => {canceled = true}
	}, [annotationClient])
	
	// const {visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange} = useTimeRange()
	const height2 = height - bottomBarHeight
	const legendWidth = nodes ? Math.min(150, width / 4) : 0
	const width2 = width - legendWidth
	const W = videoWidth * height2 < videoHeight * width2 ? videoWidth * height2 / videoHeight : width2
	const H = videoWidth * height2 < videoHeight * width2 ? height2 : videoHeight * width2 / videoWidth
	const scale =useMemo(() => ([W / videoWidth, H / videoHeight] as [number, number]), [W, H, videoWidth, videoHeight])
	const rect = useMemo(() => ({
		x: (width2 - W)  / 2,
		y: (height2 - H) / 2,
		w: W,
		h: H
	}), [W, H, width2, height2])
	const {affineTransform, handleWheel} = useWheelZoom(rect.x, rect.y, rect.w, rect.h)
	// const handleSetTimeSec = useCallback((t: number) => {
	// 	setCurrentTime(t)
	// 	if ((visibleStartTimeSec !== undefined) && (visibleEndTimeSec !== undefined)) {
	// 		if ((t < visibleStartTimeSec) || (t > visibleEndTimeSec)) {
	// 			let delta = t - (visibleStartTimeSec + visibleEndTimeSec) / 2
	// 			if (visibleStartTimeSec + delta < 0) delta = -visibleStartTimeSec
	// 			setVisibleTimeRange(visibleStartTimeSec + delta, visibleEndTimeSec + delta)
	// 		}
	// 	}
	// }, [visibleStartTimeSec, visibleEndTimeSec, setVisibleTimeRange, setCurrentTime])
	const [playing, setPlaying] = useState<boolean>(false)
	const [playbackRate, setPlaybackRate] = useState<number>(1)
	const handlePlay = useCallback(() => {
		setPlaying(true)
	}, [])
	const handleStop = useCallback(() => {
		setPlaying(false)
	}, [])
	const currentTimeRef = useRef<number>(currentTime || 0)
	useEffect(() => {
		currentTimeRef.current = currentTime || 0
	}, [currentTime])

	const [upToDate, setUpToDate] = useState<boolean>(true)

	useEffect(() => {
		if (!playing) return
		if (!upToDate) return
		// if ((videoUri) && (showVideo)) {
		// 	// the playing is taken care of by the video frame view
		// 	return
		// }
		let canceled = false
		const startTime = currentTimeRef.current
		const timer = Date.now()
		let rr = 0
		const update = () => {
			const elapsed = (Date.now() - timer) / 1000
			const newTime = Math.min(startTime + elapsed * playbackRate, frameCount / samplingFrequency)
			setCurrentTime(newTime)
			setTimeout(() => { // apparently it's important to use a small timeout here so the controls still work (e.g., the slider)
				if (canceled) return
				rr = requestAnimationFrame(update)
			}, 1)
		}
		rr = requestAnimationFrame(update)
		return () => {cancelAnimationFrame(rr); canceled = true}
	}, [playing, upToDate, videoUri, setCurrentTime, playbackRate, showVideo, frameCount, samplingFrequency])

	const colorsForNodeIds = useMemo(() => {
		const ret: {[nodeId: string]: string} = {}
		if (!nodes) return ret
		for (let i = 0; i < nodes.length; i++) {
			const ind = nodes[i].colorIndex
			const colorIndex = ind === undefined ? i : ind
			ret[nodes[i].id] = getNodeColor(colorIndex)
		}
		return ret
	}, [nodes])

	const videoClient = useMemo(() => (
		videoUri && rtcshareClient ? new VideoClient(videoUri, rtcshareClient) : undefined
	), [videoUri, rtcshareClient])

	return (
		<div className="AnnotatedVideoViewArea" style={{position: 'absolute', width, height}} onWheel={handleWheel}>
			<div className="video-frame" style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h}}>
				{/* {
					videoUri && showVideo && <VideoFrameView
						width={rect.w}
						height={rect.h}
						timeSec={currentTime}
						setTimeSec={handleSetTimeSec}
						src={videoUri}
						affineTransform={affineTransform}
						playing={playing}
						playbackRate={playbackRate}
					/>
				} */}
				{
					videoUri && showVideo && videoClient && (currentTime !== undefined) && (
						<VideoViewCanvas
							videoClient={videoClient}
							currentTime={currentTime}
							width={rect.w}
							height={rect.h}
							affineTransform={affineTransform}
							setUpToDate={setUpToDate}
						/>
					)
				}
			</div>
			{
				!upToDate && (
					<div style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h, backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
						{/* Loading icon in center */}
						<div style={{position: 'absolute', left: rect.w / 2 - 50, top: rect.h / 2 - 50, width: 100, height: 100, backgroundColor: 'rgba(255, 255, 255, 0.5)', borderRadius: 10}}>
							<div style={{position: 'absolute', left: 0, top: 0, width: 100, height: 100, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
								<div className="spinner-border" role="status">
									<span className="visually-hidden">Loading...</span>
								</div>
							</div>
						</div>	
					</div>
				)
			}
			<div className="position-decode-frame" style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h}}>
				{
					positionDecodeFieldUri && showPositionDecodeField && <PositionDecodeFieldFrameView
						width={rect.w}
						height={rect.h}
						timeSec={currentTime}
						positionDecodeFieldUri={positionDecodeFieldUri}
						affineTransform={affineTransform}
						samplingFrequency={samplingFrequency}
						scale={scale}
					/>
				}
			</div>
			<div className="annotations-frame" style={{position: 'absolute', left: rect.x, top: rect.y, width: rect.w, height: rect.h}}>
				{
					annotationUri && showAnnotations && annotationClient && <VideoAnnotationFrameView
						width={rect.w}
						height={rect.h}
						timeSec={currentTime}
						annotationClient={annotationClient}
						colorsForNodeIds={colorsForNodeIds}
						affineTransform={affineTransform}
						samplingFrequency={samplingFrequency}
						scale={scale}
					/>
				}
			</div>
			<div className="legend" style={{position: 'absolute', left: rect.x + rect.w, top: rect.y, width: legendWidth, height: rect.h, padding: 15}}>
				{
					(nodes || []).map((node, i) => (
						<div key={i}><span style={{color: colorsForNodeIds[node.id] || 'black'}}>●</span> {node.label}</div>
					))
				}
			</div>
			<ThemeProvider theme={theme}>
				<div style={{position: 'absolute', width, height: bottomBarHeight, top: height2}}>
					{!playing && <IconButton title="Play video" disabled={playing} onClick={handlePlay}><PlayArrow /></IconButton>}
					{playing && <IconButton title="Stop video" disabled={!playing} onClick={handleStop}><Stop /></IconButton>}
					<PlaybackRateControl disabled={playing} playbackRate={playbackRate} setPlaybackRate={setPlaybackRate} />
					&nbsp;
					<FormControl size="small">
						<Slider
							min={0}
							max={frameCount - 1}
							step={1}
							style={{width: 300}}
							value={Math.floor((currentTime || 0) * samplingFrequency)}
							onChange={(e, v) => {setCurrentTime((v as number) / samplingFrequency)}}
							disabled={playing}
						/>
					</FormControl>
					&nbsp;&nbsp;&nbsp;
					{annotationUri && <FormControlLabel
						control={<Checkbox checked={showAnnotations} onClick={() => {setShowAnnotations(a => !a)}} />}
						disabled={playing}
						label="annotations"
					/>}
					{positionDecodeFieldUri && <FormControlLabel
						control={<Checkbox checked={showPositionDecodeField} onClick={() => {setShowPositionDecodeField(a => !a)}} />}
						disabled={playing}
						label="position decode"
					/>}
					{videoUri && (positionDecodeFieldUri || annotationUri) && <FormControlLabel
						control={<Checkbox checked={showVideo} onClick={() => {setShowVideo(a => !a)}} />}
						disabled={playing}
						label="video"
					/>}
				</div>
			</ThemeProvider>
		</div>
	)
}

const PlaybackRateControl: FunctionComponent<{playbackRate: number, setPlaybackRate: (x: number) => void, disabled?: boolean}> = ({playbackRate, setPlaybackRate, disabled}) => {
	const handleChange = useCallback((e: SelectChangeEvent) => {
		setPlaybackRate(parseFloat(e.target.value))
	}, [setPlaybackRate])
	return (
		<FormControl size="small">
			<Select disabled={disabled} onChange={handleChange} value={playbackRate + ''}>
				<MenuItem key={0.1} value={0.1}>0.1x</MenuItem>
				<MenuItem key={0.25} value={0.25}>0.25x</MenuItem>
				<MenuItem key={0.5} value={0.5}>0.5x</MenuItem>
				<MenuItem key={1} value={1}>1x</MenuItem>
				<MenuItem key={2} value={2}>2x</MenuItem>
				<MenuItem key={4} value={4}>4x</MenuItem>
				<MenuItem key={8} value={8}>8x</MenuItem>
			</Select>
		</FormControl>
	)
}

export default AnnotatedVideoViewArea
