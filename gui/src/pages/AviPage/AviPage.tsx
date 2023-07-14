import { FunctionComponent, useEffect, useState } from "react"
import useWheelZoom from "../BrowsePage/FileView/AnnotatedVideoView/useWheelZoom"
import { getEtage } from "../NwbPage/NwbPage"
import VideoFrameView from "./VideoFrameView"

type Props = {
    width: number
    height: number
    url: string
}

const locationUrl = window.location.href
const locationQueryString = locationUrl.split('?')[1] || ''
const locationQuery = new URLSearchParams(locationQueryString)


// Example: https://flatironinstitute.github.io/neurosift/?p=/avi&url=https://dandiarchive.s3.amazonaws.com/blobs/30b/964/30b9646b-a9d3-40e6-8d8a-d356ef6553c2

const AviPage: FunctionComponent<Props> = ({width, height, url}) => {
    const [mp4Url, setMp4Url] = useState<string | undefined | null>(undefined)

    useEffect(() => {
        let canceled = false
        ;(async () => {
            const etag = await getEtage(url)
            if (!etag) {
                setMp4Url(null)
                return
            }
            if (canceled) return
            const x = `https://neurosift.org/computed/avi/ETag/${etag.slice(0, 2)}/${etag.slice(2, 4)}/${etag.slice(4, 6)}/${etag}/converted.mp4`
            setMp4Url(x)
        })()
        return () => {canceled = true}
    }, [url])

    if (mp4Url === null) {
        return (
            <div>Unable to find file: {url}</div>
        )
    }
    if (!mp4Url) return (
        <div>Loading...</div>
    )
    if (locationQuery.get('test') === '1') {
        return (
            <TestMp4Html5 url={mp4Url} width={width} height={height} />
        )
    }
    return (
        <video
            src={mp4Url}
            controls
            style={{width, height}}
        />
    )
}

const TestMp4Html5: FunctionComponent<{url: string, width: number, height: number}> = ({url, width, height}) => {
    const [currentTime, setCurrentTime] = useState<number>(0)

    const {affineTransform, handleWheel} = useWheelZoom(0, 0, width, height)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(t => t + 0.04)
        }, 40)
        return () => {
            clearInterval(timer)
        }
    }, [])
    const bottomBarHeight = 30
    return (
        <div style={{width, height, position: 'absolute'}} onWheel={handleWheel}>
            <div style={{position: 'absolute', width, height: height - bottomBarHeight, overflow: 'hidden'}}>
                <VideoFrameView
                    src={url}
                    timeSec={currentTime}
                    playbackRate={1}
                    width={width}
                    height={height}
                    affineTransform={affineTransform}
                />
            </div>
            <div style={{position: 'absolute', width, height: height - bottomBarHeight, overflow: 'hidden'}}>
                <ExampleAnnotationsView width={width} height={height - bottomBarHeight} />
            </div>
            <div style={{position: 'absolute', width, height: bottomBarHeight, top: height - bottomBarHeight}}>
                <div style={{paddingLeft: 50}}>currentTime: {currentTime.toFixed(2)}</div>
            </div>
        </div>
    )
}

const ExampleAnnotationsView: FunctionComponent<{width: number, height: number}> = ({width, height}) => {
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | undefined>(undefined)
    useEffect(() => {
        if (!canvasElement) return
        const ctx: CanvasRenderingContext2D | null = canvasElement.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        // draw text at the center of this rect
        ctx.fillStyle = 'white'
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('Example annotation overlay', width / 2, height / 2 - 150)

        // draw some AI generated canvas shapes
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)'
        ctx.fillRect(width / 2 - 100, width / 2 - 100, 200, 200)
        ctx.fillStyle = 'rgba(0, 255, 0, 0.4)'
        ctx.fillRect(width / 2, width / 2, 200, 200)
        ctx.fillStyle = 'rgba(0, 0, 255, 0.4)'
        ctx.fillRect(width / 2 + 100, width / 2 + 100, 200, 200)
    }, [canvasElement, width, height])
    return (
        <canvas
            width={width}
            height={height}
            ref={elmt => elmt && setCanvasElement(elmt)}
        />
    )
}

export default AviPage