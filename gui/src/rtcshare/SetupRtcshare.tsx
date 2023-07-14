import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useWebrtc, getWebrtcConnectionToService } from "./config"
import postApiRequest from "./postApiRequest"
import { initialRtcshareData, RtcshareContext, rtcshareReducer } from "./RtcshareDataManager/RtcshareData"
import RtcshareFileSystemClient from "./RtcshareDataManager/RtcshareFileSystemClient"
import { isProbeResponse, ProbeRequest, protocolVersion } from "./RtcshareRequest"

const SetupRtcshare: FunctionComponent<PropsWithChildren> = ({children}) => {
    const [data, dataDispatch] = useReducer(rtcshareReducer, initialRtcshareData)
    const [usingProxy, setUsingProxy] = useState<boolean | undefined>(undefined)

    // instantiate the client
    useEffect(() => {
        // should only be instantiated once
        const client = new RtcshareFileSystemClient()
        dataDispatch({type: 'setClient', client})
        return () => {
            // c.stop()
        }
    }, [])

    const [connectionCheckRefreshCode, setConnectionCheckRefreshCode] = useState(0)
    const checkConnectionStatus = useCallback(() => {
        setConnectionCheckRefreshCode(c => (c + 1))
    }, [])

    const value = useMemo(() => ({
        data,
        dispatch: dataDispatch,
        checkConnectionStatus
    }), [data, dataDispatch, checkConnectionStatus])

    // wait for webrtc connection (if using)
    const [webrtcConnectionStatus, setWebrtcConnectionStatus] = useState<'pending' | 'connected' | 'error' | 'unused'>('pending')
    useEffect(() => {
        let canceled = false
        if (!useWebrtc) {
            setWebrtcConnectionStatus('unused')
            return
        }
        function check() {
            if (canceled) return
            const webrtcConnectionToService = getWebrtcConnectionToService()
            const ss = webrtcConnectionToService?.status || 'pending'
            if ((ss === 'connected') || (ss === 'error')) {
                setWebrtcConnectionStatus(ss)
                return
            }
            setTimeout(() => {
                check()
            }, 100)
        }
        check()
        return () => {canceled = true}
    }, [])

    useEffect(() => {
        dataDispatch({type: 'setWebrtcConnectionStatus', status: webrtcConnectionStatus})
    }, [webrtcConnectionStatus])

    useEffect(() => {
        dataDispatch({type: 'setUsingProxy', usingProxy})
    }, [usingProxy])

    // check whether we are connected
    useEffect(() => {
        if ((webrtcConnectionStatus === 'connected') || (webrtcConnectionStatus === 'unused')) {
            // the following line causes some undesired effects in the GUI when clicking the "check connection status" button
            // dataDispatch({type: 'setConnectedToService', connected: undefined})

            setUsingProxy(undefined)
            ;(async () => {
                try {
                    const req: ProbeRequest = {
                        type: 'probeRequest'
                    }
                    const {response: resp} = await postApiRequest(req)
                    if (!isProbeResponse(resp)) {
                        console.warn(resp)
                        throw Error('Unexpected probe response')
                    }
                    setUsingProxy(resp.proxy ? true : false)
                    if (resp.protocolVersion !== protocolVersion) {
                        throw Error(`Unexpected protocol version: ${resp.protocolVersion} <> ${protocolVersion}`)
                    }
                    dataDispatch({type: 'setConnectedToService', connected: true})
                }
                catch(err) {
                    dataDispatch({type: 'setConnectedToService', connected: false})
                }
            })()
        }
    }, [webrtcConnectionStatus, connectionCheckRefreshCode])

    return (
        <RtcshareContext.Provider value={value}>
            {children}
        </RtcshareContext.Provider>
    )
}

export default SetupRtcshare