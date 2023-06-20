import WebrtcConnectionToService from "./WebrtcConnectionToService"

const urlSearchParams = new URLSearchParams(window.location.search)
const queryParams = Object.fromEntries(urlSearchParams.entries())

export const defaultServiceBaseUrl = 'http://localhost:61752'

export const serviceBaseUrl = queryParams.sh ? (
    queryParams.sh
) : (
    defaultServiceBaseUrl
)

export const useWebrtc = queryParams.webrtc === '1'

let webrtcConnectionToService: WebrtcConnectionToService | undefined = undefined

export const getWebrtcConnectionToService = () => {
    if ((useWebrtc) && (!webrtcConnectionToService)) {
        webrtcConnectionToService = new WebrtcConnectionToService()
    }
    return webrtcConnectionToService
}