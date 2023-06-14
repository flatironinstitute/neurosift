import { serviceBaseUrl, useWebrtc, getWebrtcConnectionToService } from "./config"
import parseMessageWithBinaryPayload from "./parseMessageWithBinaryPayload"
import { isRtcshareResponse, RtcshareRequest, RtcshareResponse } from "./RtcshareRequest"

const postApiRequest = async (request: RtcshareRequest): Promise<{response: RtcshareResponse, binaryPayload: ArrayBuffer | undefined}> => {
    const webrtcConnectionToService = getWebrtcConnectionToService()
    if ((useWebrtc) && (request.type !== 'probeRequest') && (request.type !== 'webrtcSignalingRequest')) {
        if (!webrtcConnectionToService) {
            throw Error('No webrtc connection to service')
        }
        if (webrtcConnectionToService.status === 'connected') {
            return webrtcConnectionToService.postApiRequest(request)
        }
    }
    const rr = await fetch(
        `${serviceBaseUrl}/api`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request)
        }
    )
    if (rr.status !== 200) {
        throw Error(`Error posting API request: ${await rr.text()}`)
    }
    const buf = await rr.arrayBuffer()
    const {message: response, binaryPayload} = parseMessageWithBinaryPayload(buf)
    if (!isRtcshareResponse) {
        console.warn(response)
        throw Error('Unexpected api response')
    }
    return {response, binaryPayload}
}

export default postApiRequest