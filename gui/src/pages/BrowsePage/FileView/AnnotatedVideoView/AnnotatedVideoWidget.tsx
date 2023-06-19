import { FunctionComponent } from "react";
import AnnotatedVideoViewArea from "./AnnotatedVideoViewArea";
// import { colorForPointIndex } from "./PoseViewport";

type Props = {
	width: number
	height: number
	currentTime: number
	setCurrentTime: (t: number) => void
	videoUri?: string
	videoWidth: number
	videoHeight: number
	videoNumFrames: number
	samplingFrequency: number
	annotationUri?: string
	positionDecodeFieldUri?: string
	// canEditPose: boolean
}

const AnnotatedVideoWidget: FunctionComponent<Props> = ({width, height, currentTime, setCurrentTime, videoUri, videoWidth, videoHeight, videoNumFrames, samplingFrequency, annotationUri, positionDecodeFieldUri}) => {
	// const topPanelHeight = 100
	// const legendWidth = 50
	const topPanelHeight = 0
	const legendWidth = 0
	
	const viewAreaWidth = width - legendWidth
	const viewAreaHeight = height - topPanelHeight - 5

	return (
		<div className="AnnotatedVideoWidget" style={{position: 'absolute', width, height, overflow: 'hidden'}}>
			<div style={{position: 'absolute', top: topPanelHeight, width: viewAreaWidth, height: viewAreaHeight}}>
				<AnnotatedVideoViewArea
					width={viewAreaWidth}
					height={viewAreaHeight}
					currentTime={currentTime}
					setCurrentTime={setCurrentTime}
					videoUri={videoUri}
					annotationUri={annotationUri}
					positionDecodeFieldUri={positionDecodeFieldUri}
					videoWidth={videoWidth}
					videoHeight={videoHeight}
					samplingFrequency={samplingFrequency}
					frameCount={videoNumFrames}
					onSelectRect={() => {}}
				/>
			</div>
		</div>
	)
}

export default AnnotatedVideoWidget
