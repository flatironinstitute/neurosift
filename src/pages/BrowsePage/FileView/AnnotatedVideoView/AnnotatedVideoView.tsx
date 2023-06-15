import { FunctionComponent, useCallback, useContext, useEffect } from "react"
import { TimeseriesSelectionContext, useTimeseriesSelection, useTimeseriesSelectionInitialization } from "../../../../package/context-timeseries-selection"
import { AnnotatedVideoViewData } from "./AnnotatedVideoViewData"
import AnnotatedVideoWidget from "./AnnotatedVideoWidget"

type Props = {
	data: AnnotatedVideoViewData
	width: number
	height: number
}

const AnnotatedVideoView: FunctionComponent<Props> = ({data, width, height}) => {
	const {samplingFrequency, videoUri, videoWidth, videoHeight, videoNumFrames, annotationUri, positionDecodeFieldUri} = data
    const {currentTime} = useTimeseriesSelection()
    const {timeseriesSelectionDispatch} = useContext(TimeseriesSelectionContext)
    const handleSetCurrentTime = useCallback((time: number) => {
        timeseriesSelectionDispatch({type: 'setFocusTime', currentTimeSec: time, autoScrollVisibleTimeRange: true})
    }, [timeseriesSelectionDispatch])
    useTimeseriesSelectionInitialization(0, videoNumFrames / samplingFrequency)
    useEffect(() => {
        if (currentTime === undefined) {
            setTimeout(() => handleSetCurrentTime(0), 1) // for some reason we need to use setTimeout for initialization - probably because we are waiting for useTimeseriesSelectionInitialization
        }
    }, [currentTime, handleSetCurrentTime])
	return (
        <AnnotatedVideoWidget
            width={width}
            height={height}
            currentTime={currentTime || 0}
            setCurrentTime={handleSetCurrentTime}
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
