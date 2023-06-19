import { FunctionComponent, useEffect, useState } from "react";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import { AnnotatedVideoView, AnnotatedVideoViewData } from "./AnnotatedVideoView";
import JsonlClient from "./AnnotatedVideoView/JsonlClient";

type Props = {
    width: number
    height: number
    filePath: string
}

const VideoAnnotationFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const {client: rtcshareClient} = useRtcshare()

    const [jsonlClient, setJsonlClient] = useState<JsonlClient>()
    useEffect(() => {
        let canceled = false
        if (!rtcshareClient) return
        (async () => {
            const client = new JsonlClient(`rtcshare://${filePath}`, rtcshareClient)
            await client.initialize()
            if (canceled) return
            setJsonlClient(client)
        })()
        return () => {canceled = true}
    }, [filePath, rtcshareClient])

    const [viewData, setViewData] = useState<AnnotatedVideoViewData>()

    useEffect(() => {
        if (!jsonlClient) return
        let canceled = false
        ;(async () => {
            const firstRec = await jsonlClient.getRecord(0)
            if (!firstRec) return
            if (canceled) return
            setViewData({
                type: 'AnnotatedVideo',
                videoUri: undefined,
                videoWidth: firstRec.width,
                videoHeight: firstRec.height,
                videoNumFrames: jsonlClient.numRecords - 1,
                samplingFrequency: firstRec.frames_per_second,
                annotationUri: `rtcshare://${filePath}`
            })
        })()
        return () => {canceled = true}
    }, [jsonlClient, filePath])

    if (!viewData) {
        return <div>Loading</div>
    }

    return (
        <AnnotatedVideoView
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default VideoAnnotationFileView