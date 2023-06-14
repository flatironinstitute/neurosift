import { FunctionComponent, useEffect, useState } from "react"
import { useTimeseriesSelection, useTimeseriesSelectionInitialization } from "../../../../package/context-timeseries-selection"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import { AnnotatedVideoNode, AnnotatedVideoViewData } from "./AnnotatedVideoViewData"
import AnnotatedVideoWidget from "./AnnotatedVideoWidget"

type Props = {
	data: AnnotatedVideoViewData
	width: number
	height: number
}

const AnnotatedVideoView: FunctionComponent<Props> = ({data, width, height}) => {
	const {samplingFrequency, videoUri, videoWidth, videoHeight, videoNumFrames, annotationsUri, nodesUri, positionDecodeFieldUri} = data
    const {currentTime, setCurrentTime} = useTimeseriesSelection()
    useTimeseriesSelectionInitialization(0, videoNumFrames / samplingFrequency)
    const {client: rtcshareClient} = useRtcshare()
    useEffect(() => {
        if (currentTime === undefined) {
            setTimeout(() => setCurrentTime(0), 1) // for some reason we need to use setTimeout for initialization - probably because we are waiting for useTimeseriesSelectionInitialization
        }
    }, [currentTime, setCurrentTime])
    const [nodes, setNodes] = useState<AnnotatedVideoNode[]>()
    useEffect(() => {
        if (!nodesUri) return
        if (!rtcshareClient) return
        rtcshareClient.readFile(nodesUri).then((x: ArrayBuffer) => {
            // convert array buffer to string
            const decoder = new TextDecoder('utf-8')
            const s = decoder.decode(x)
            // parse json
            const nodes = JSON.parse(s)
            setNodes(nodes)
        })
    }, [nodesUri, rtcshareClient])
	return (
        <AnnotatedVideoWidget
            width={width}
            height={height}
            currentTime={currentTime || 0}
            setCurrentTime={setCurrentTime}
            videoUri={videoUri}
            annotationsUri={annotationsUri}
            nodes={nodes}
            positionDecodeFieldUri={positionDecodeFieldUri}
            videoWidth={videoWidth}
            videoHeight={videoHeight}
            videoNumFrames={videoNumFrames}
            samplingFrequency={samplingFrequency}
        />
    )
}

export default AnnotatedVideoView
