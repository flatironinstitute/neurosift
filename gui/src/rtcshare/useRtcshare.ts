import { useContext } from 'react'
import { RtcshareContext } from './RtcshareDataManager/RtcshareData'

export const useRtcshare = () => {
    const { data, checkConnectionStatus } = useContext(RtcshareContext)

    return {
        client: data.client,
        connectedToService: data.connectedToService,
        webrtcConnectionStatus: data.webrtcConnectionStatus,
        usingProxy: data.usingProxy,
        checkConnectionStatus
    }
}