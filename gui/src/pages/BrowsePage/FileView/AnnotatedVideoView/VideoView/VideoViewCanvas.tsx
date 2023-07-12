import { FunctionComponent, useEffect, useRef } from "react";
import { AffineTransform } from "../AffineTransform";
import VideoClient from "./VideoClient";

type Props = {
    videoClient: VideoClient
    currentTime: number
    width: number
    height: number
    affineTransform?: AffineTransform
    setUpToDate: (upToDate: boolean) => void
}

const VideoViewCanvas: FunctionComponent<Props> = ({videoClient, currentTime, width, height, affineTransform, setUpToDate}) => {
    const canvasRef = useRef<any>(null)
	useEffect(() => {
        let canceled = false
		const ctxt: CanvasRenderingContext2D | undefined = canvasRef.current?.getContext('2d')
		if (!ctxt) return
        if (!videoClient) return

        // ctxt.clearRect(0, 0, ctxt.canvas.width, ctxt.canvas.height)

        ; (async () => {
            if (canceled) return
            const videoInfo = await videoClient.videoInfo()
            const fps = videoInfo.fps
            const currentFrame = Math.round(currentTime * fps)
            setUpToDate(false)
            const frameImage = await videoClient.getFrameImage(currentFrame)
            if (canceled) return
            if (!frameImage) return
            setUpToDate(true)
            const b64 = arrayBufferToBase64(frameImage)
            const dataUrl = `data:image/jpeg;base64,${b64}`

            const img = new Image()
            img.onload = () => {
                if (canceled) return

                // important to apply the affine transform in the synchronous part
                ctxt.save()
                if (affineTransform) {
                    const ff = affineTransform.forward
                    ctxt.transform(ff[0][0], ff[1][0], ff[0][1], ff[1][1], ff[0][2], ff[1][2])
                }
                ctxt.drawImage(img, 0, 0, width, height)
                ctxt.restore()
                //////
            }
            img.src = dataUrl;
        })()
        return () => {canceled = true}
	}, [currentTime, videoClient, width, height, affineTransform, setUpToDate])

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

function arrayBufferToBase64( buffer: ArrayBuffer ) {
    let binary = '';
    const bytes = new Uint8Array( buffer );
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
}

export default VideoViewCanvas