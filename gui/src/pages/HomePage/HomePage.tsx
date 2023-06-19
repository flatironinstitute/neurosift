import { FunctionComponent, useEffect, useState } from "react";
import postApiRequest from "../../rtcshare/postApiRequest";
import { ProbeRequest } from "../../rtcshare/RtcshareRequest";
import {defaultServiceBaseUrl} from '../../rtcshare/config'
import Hyperlink from "../../components/Hyperlink";
import useRoute from "../../useRoute";

type Props = {
    width: number
    height: number
}

const HomePage: FunctionComponent<Props> = ({width, height}) => {
    return (
        <div style={{padding: 20}}>
            <CheckRtcshareConnectivity />
        </div>
    )
}

const CheckRtcshareConnectivity: FunctionComponent = () => {
    const [rtcshareAvailable, setRtcshareAvailable] = useState<boolean | undefined>(undefined)
    const {setRoute} = useRoute()
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
    if (rtcshareAvailable === undefined) {
        return (
            <div>
                Checking Rtcshare connectivity...
            </div>
        )
    }
    else if (!rtcshareAvailable) {
        return (
            <div>
                Unable to connect to Rtcshare at {defaultServiceBaseUrl}
            </div>
        )
    }
    else {
        return (
            <div>
                <p>
                    Connected to Rtcshare at {defaultServiceBaseUrl}
                </p>
                <p>
                    <Hyperlink onClick={() => setRoute({page: 'browse', folder: ''})}>Browse</Hyperlink>
                </p>
            </div>
        )
    }
}

export default HomePage