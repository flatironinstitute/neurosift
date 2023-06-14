import { FunctionComponent, useEffect } from "react"
import { useTimeseriesSelection, useTimeseriesSelectionInitialization } from "../../../../package/context-timeseries-selection"
import { AnnotatedVideoViewData } from "./AnnotatedVideoViewData"
import AnnotatedVideoWidget from "./AnnotatedVideoWidget"

type Props = {
	data: AnnotatedVideoViewData
	width: number
	height: number
}

const AnnotatedVideoView: FunctionComponent<Props> = ({data, width, height}) => {
	const {samplingFrequency, videoUri, videoWidth, videoHeight, videoNumFrames, annotationUri, positionDecodeFieldUri} = data
    const {currentTime, setCurrentTime} = useTimeseriesSelection()
    useTimeseriesSelectionInitialization(0, videoNumFrames / samplingFrequency)
    useEffect(() => {
        if (currentTime === undefined) {
            setTimeout(() => setCurrentTime(0), 1) // for some reason we need to use setTimeout for initialization - probably because we are waiting for useTimeseriesSelectionInitialization
        }
    }, [currentTime, setCurrentTime])
	return (
        <AnnotatedVideoWidget
            width={width}
            height={height}
            currentTime={currentTime || 0}
            setCurrentTime={setCurrentTime}
            videoUri={videoUri}
            annotationUri={annotationUri}
            positionDecodeFieldUri={positionDecodeFieldUri}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            videoNumFrames={videoNumFrames}
            samplingFrequency={samplingFrequency}
        />
    )
}

export default AnnotatedVideoView
