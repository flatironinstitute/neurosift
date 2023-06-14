import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { AnnotatedVideoView, AnnotatedVideoViewData } from "./AnnotatedVideoView";
// import { AnnotatedVideoView, AnnotatedVideoViewData } from "./view-annotated-video";

type Props = {
    filePath: string
    width: number
    height: number
}

type VideoInfo = {
    width: number
    height: number
    fps: number
    frame_count: number
}

const VideoFileView: FunctionComponent<Props> = ({ filePath, width, height }) => {
    const {client} = useRtcshare()
    const [videoInfo, setVideoInfo] = useState<VideoInfo>()
    useEffect(() => {
        if (!client) return
        (async () => {
            const {result} = await client.serviceQuery('video', {
                type: 'get_video_info',
                path: `rtcshare://${filePath}`
            })
            setVideoInfo(result.info)
        })()
    }, [filePath, client])
    const annotatedVideoViewData: AnnotatedVideoViewData | undefined = useMemo(() => {
        if (!videoInfo) return undefined
        return {
            type: 'misc.AnnotatedVideo',
            videoUri: `rtcshare://${filePath}`,
            videoWidth: videoInfo.width,
            videoHeight: videoInfo.height,
            videoNumFrames: videoInfo.frame_count,
            samplingFrequency: videoInfo.fps,
            annotationsUri: undefined,
            nodesUri: undefined,
            positionDecodeFieldUri: undefined
        }
    }, [filePath, videoInfo])
    if (!annotatedVideoViewData) {
        return <div>Loading</div>
    }
    return (
        <AnnotatedVideoView
            data={annotatedVideoViewData}
            width={width}
            height={height}
        />
    )
}

export default VideoFileView