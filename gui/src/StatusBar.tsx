import { FunctionComponent } from "react";
import { useRtcshareConnection } from "./RtcshareConnection/RtcshareConnectionContext";

type Props = {
    width: number
    height: number
}

export const connectedColor = '#050'
export const notConnectedColor = '#500'

export const statusBarHeight = 18

const StatusBar: FunctionComponent<Props> = ({width, height}) => {
    const {rtcshareAvailable, rtcshareUrl} = useRtcshareConnection()
    return (
        <div style={{fontSize: 12, paddingTop: 3, paddingLeft: 5}}>
            {
                rtcshareAvailable === undefined ? (
                    <span>Checking Rtcshare connectivity...</span>
                ) : rtcshareAvailable ? (
                    <span style={{color: connectedColor}}>Connected to rtcshare at {rtcshareUrl}</span>
                ) : (
                    <span style={{color: notConnectedColor}}>Unable to connect to rtcshare at {rtcshareUrl}</span>
                )
            }
        </div>
    )
}

export default StatusBar