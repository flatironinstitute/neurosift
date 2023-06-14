import { FunctionComponent, useState } from "react";
import AnnotatedVideoViewArea from "./AnnotatedVideoViewArea";
import { AnnotatedVideoNode } from "./AnnotatedVideoViewData";
// import { colorForPointIndex } from "./PoseViewport";

type Props ={
	width: number
	height: number
	videoUri?: string
	videoWidth: number
	videoHeight: number
	videoNumFrames: number
	samplingFrequency: number
	annotationsUri?: string
	nodes?: AnnotatedVideoNode[]
	positionDecodeFieldUri?: string
	// canEditPose: boolean
}

const AnnotatedVideoWidget: FunctionComponent<Props> = ({width, height, videoUri, videoWidth, videoHeight, videoNumFrames, samplingFrequency, annotationsUri, nodes, positionDecodeFieldUri}) => {
	// const topPanelHeight = 100
	// const legendWidth = 50
	const topPanelHeight = 0
	const legendWidth = 0
	
	const viewAreaWidth = width - legendWidth
	const viewAreaHeight = height - topPanelHeight - 5

	const [currentTime, setCurrentTime] = useState<number>(0)

	return (
		<div className="AnnotatedVideoWidget" style={{position: 'absolute', width, height, overflow: 'hidden'}}>
			<div style={{position: 'absolute', top: topPanelHeight, width: viewAreaWidth, height: viewAreaHeight}}>
				<AnnotatedVideoViewArea
					width={viewAreaWidth}
					height={viewAreaHeight}
					currentTime={currentTime}
					setCurrentTime={setCurrentTime}
					videoUri={videoUri}
					annotationsUri={annotationsUri}
					nodes={nodes}
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
