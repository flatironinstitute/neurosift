import { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { AffineTransform } from "./AffineTransform";
import VideoAnnotationClient, { VideoAnnotationElement, VideoAnnotationFrame } from "./VideoAnnotationClient";

type Props ={
	annotationClient: VideoAnnotationClient
	colorsForNodeIds: {[nodeId: string]: string}
	timeSec: number | undefined
	samplingFrequency: number
	width: number
	height: number
	affineTransform: AffineTransform
	scale: [number, number]
}

// The default radius for a marker object
const defaultMarkerRadius = 4

// The default width of a line or connector object
const defaultLineWidth = 1.1

const VideoAnnotationFrameView: FunctionComponent<Props> = ({annotationClient, colorsForNodeIds, timeSec, width, height, affineTransform, samplingFrequency, scale}) => {
	// const [annotationsUrl, setAnnotationsUrl] = useState<string>()
	// useEffect(() => {
	// 	if (annotationsUri.startsWith('sha1://')) {
	// 		getFileDataUrl(annotationsUri).then((url) => {
	// 			setAnnotationsUrl(url)
	// 		}).catch(err => {
	// 			console.warn(`Problem getting file data url for ${annotationsUri}`)
	// 		})
	// 	}
	// 	else {
	// 		setAnnotationsUrl(annotationsUri)
	// 	}
	// }, [annotationsUri])
	
	const [annotationFrame, setAnnotationFrame] = useState<VideoAnnotationFrame | undefined>()
	useEffect(() => {
		setAnnotationFrame(undefined)
		if (timeSec === undefined) return
		const frameIndex = Math.round(timeSec * samplingFrequency)
		if (frameIndex < 0) return
		let canceled = false
		annotationClient.getFrame(frameIndex).then(f => {
			if (canceled) return
			setAnnotationFrame(f)
		})
		return () => {canceled = true}
	}, [annotationClient, timeSec, samplingFrequency])

	const zoomScaleFactor = useMemo(() => {
		if (!affineTransform) return 1
		const ff = affineTransform.forward
		return 1 / Math.sqrt(ff[0][0] * ff[1][1] - ff[0][1] * ff[1][0])
	}, [affineTransform])

	const canvasRef = useRef<any>(null)
	useEffect(() => {
		const ctxt: CanvasRenderingContext2D | undefined = canvasRef.current?.getContext('2d')
		if (!ctxt) return

		ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height)

		ctxt.save()
		const ff = affineTransform.forward
		ctxt.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2])

		const elements = annotationFrame?.e || []

		const drawNode = (n: VideoAnnotationElement & {t: 'n'}) => {
			const o = {
				x: n.x * scale[0],
				y: n.y * scale[1],
				selected: false,
				attributes: {
					radius: undefined,
					shape: undefined,
					fillColor: colorsForNodeIds[n.i] || 'magenta',
					lineColor: 'black'
				},
				selectedAttributes: {
					radius: undefined,
					shape: undefined,
					fillColor: colorsForNodeIds[n.i] || 'magenta',
					lineColor: 'black'
				}
			}
			const attributes = !o.selected ? o.attributes : o.selectedAttributes || {...o.attributes, fillColor: 'orange', radius: (o.attributes.radius || defaultMarkerRadius) * 1.5}
			const radius = (attributes.radius || defaultMarkerRadius)
			const shape = o.attributes.shape || 'circle'
			ctxt.lineWidth = defaultLineWidth
			ctxt.fillStyle = attributes.fillColor || 'black'
			ctxt.strokeStyle = attributes.lineColor || 'black'

			const pp = {x: o.x, y: o.y}

			ctxt.beginPath()
			if (shape === 'circle') {
				ctxt.ellipse(pp.x, pp.y, radius, radius, 0, 0, 2 * Math.PI)
			}
			else if (shape === 'square') {
				ctxt.rect(pp.x - radius, pp.y - radius, radius * 2, radius * 2)
			}
			attributes.fillColor && ctxt.fill()
			attributes.lineColor && ctxt.stroke()
		}

		const drawEdge = (n: VideoAnnotationElement & {t: 'e'}) => {
			const e1 = elements.filter(e => (e.i === n.i1 && e.t === 'n')).map(e => (e as VideoAnnotationElement & {t: 'n'}))[0]
			const e2 = elements.filter(e => (e.i === n.i2 && e.t === 'n')).map(e => (e as VideoAnnotationElement & {t: 'n'}))[0]
			if ((e1) && (e2)) {
				const o = {
					attributes: {
						dash: [],
						width: 1,
						color: 'magenta'
					}
				}
				const obj1 = {
					x: e1.x * scale[0],
					y: e1.y * scale[1]
				}
				const obj2 = {
					x: e2.x * scale[0],
					y: e2.y * scale[1]
				}
				const pp1 = {x: obj1.x, y: obj1.y}
				// if ((draggingObject) && (obj1.objectId === draggingObject.object?.objectId) && (draggingObject.newPoint)) {
				// 	// use the new location if dragging
				// 	pp1 = draggingObject.newPoint
				// }

				const pp2 = {x: obj2.x, y: obj2.y}
				// if ((draggingObject) && (obj2.objectId === draggingObject.object?.objectId) && (draggingObject.newPoint)) {
				// 	// use the new location if dragging
				// 	pp2 = draggingObject.newPoint
				// }

				const attributes = o.attributes
				if (attributes.dash) ctxt.setLineDash(attributes.dash)
				ctxt.lineWidth = (attributes.width || defaultLineWidth) * zoomScaleFactor
				ctxt.strokeStyle = attributes.color || 'black'
				ctxt.beginPath()
				ctxt.moveTo(pp1.x, pp1.y)
				ctxt.lineTo(pp2.x, pp2.y)
				ctxt.stroke()
				ctxt.setLineDash([])
			}			
		}

		if (annotationFrame) {
			for (const element of annotationFrame.e) {
				if (element.t === 'n') {
					drawNode(element)
				}
				else if (element.t === 'e') {
					drawEdge(element)
				}
			}
		}
		
		ctxt.restore()
	}, [affineTransform, annotationClient, timeSec, annotationFrame, zoomScaleFactor, scale, colorsForNodeIds])
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



export default VideoAnnotationFrameView
