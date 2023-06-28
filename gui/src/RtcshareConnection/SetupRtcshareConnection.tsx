import { FunctionComponent, PropsWithChildren, useEffect, useMemo, useState } from "react";
import { defaultServiceBaseUrl, serviceBaseUrl } from "../rtcshare/config";
import postApiRequest from "../rtcshare/postApiRequest";
import { ProbeRequest } from "../rtcshare/RtcshareRequest";
import { RtcshareConnectionContext } from "./RtcshareConnectionContext";

const SetupRtcshareConnection: FunctionComponent<PropsWithChildren> = ({children}) => {
    const [rtcshareAvailable, setRtcshareAvailable] = useState<boolean | undefined>(undefined)
    useEffect(() => {
        const checkRtcshareAvailable = async () => {
            const req: ProbeRequest = {
                type: 'probeRequest'
            }
            try {
                const {response} = await postApiRequest(req)
                if (response.type !== 'probeResponse') {
                    throw Error(`Unexpected response type: ${response.type}`)
                }
                const protocolVersion = response.protocolVersion
                console.info(`Rtcshare protocol version ${protocolVersion}`)
                setRtcshareAvailable(true)
            }
            catch (err) {
                setRtcshareAvailable(false)
                return
            }
        }
        checkRtcshareAvailable()
    }, [])
    const value = useMemo(() => {
        return {
            rtcshareUrl: serviceBaseUrl || defaultServiceBaseUrl,
            rtcshareAvailable
        }
    }, [rtcshareAvailable])
    return (
        <RtcshareConnectionContext.Provider value={value}>
            {children}
        </RtcshareConnectionContext.Provider>
    )
}

export default SetupRtcshareConnection