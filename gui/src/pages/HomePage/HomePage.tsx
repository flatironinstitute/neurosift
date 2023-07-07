import { FunctionComponent, useCallback, useState } from "react";
import { FaGithub } from "react-icons/fa";
import Hyperlink from "../../components/Hyperlink";
import { defaultServiceBaseUrl, serviceBaseUrl } from "../../rtcshare/config";
import { useRtcshareConnection } from "../../RtcshareConnection/RtcshareConnectionContext";
import { connectedColor, notConnectedColor } from "../../StatusBar";
import useRoute from "../../useRoute";

type Props = {
    width: number
    height: number
}

const HomePage: FunctionComponent<Props> = ({width, height}) => {
    return (
        <div style={{padding: 20}}>
            <h2>Welcome to Neurosift</h2>
            <p><Hyperlink href="https://github.com/flatironinstitute/neurosift/blob/main/README.md" target="_blank">About this project</Hyperlink></p>
            <p><FaGithub /> Please <Hyperlink href="https://github.com/flatironinstitute/neurosift" target="_blank">star us</Hyperlink> on GitHub.</p>
            <hr / >
            <CheckRtcshareConnectivity />
        </div>
    )
}

const CheckRtcshareConnectivity: FunctionComponent = () => {
    const {rtcshareAvailable, rtcshareUrl} = useRtcshareConnection()
    const {setRoute} = useRoute()

    const handleConnectToLocalRtcshare = useCallback(() => {
        const urlObj = new URL(window.location.href)
        urlObj.searchParams.delete('sh')
        window.location.href = urlObj.toString()
    }, [])

    const contentConnect = (
        <div>
            {
                serviceBaseUrl !== defaultServiceBaseUrl && <p><Hyperlink onClick={handleConnectToLocalRtcshare}>Connect to local rtcshare</Hyperlink></p>
            }
            <ConnectToRemoteComponent />
        </div>
    )

    if (rtcshareAvailable === undefined) {
        return (
            <div>
                <p>
                    Checking Rtcshare connectivity...
                </p>
                <hr />
                {contentConnect}
            </div>
        )
    }
    else if (!rtcshareAvailable) {
        return (
            <div>
                <p><span style={{color: notConnectedColor}}>Unable to connect to rtcshare at {rtcshareUrl}</span></p>
                <hr />
                {contentConnect}
            </div>
        )
    }
    else {
        return (
            <div>
                <p>
                    <span style={{color: connectedColor}}>Connected to rtcshare at {rtcshareUrl}</span>
                </p>
                <p>
                    <Hyperlink onClick={() => setRoute({page: 'browse', folder: ''})}>Browse</Hyperlink>
                </p>
                <hr />
                {contentConnect}
            </div>
        )
    }
}

const ConnectToRemoteComponent: FunctionComponent = () => {
    const [textEditVisible, setTextEditVisible] = useState(false)
    const [editUrlText, setEditUrlText] = useState('')
    return (
        <div>
            {
                textEditVisible ? (
                    <div>
                        <div style={{paddingBottom: 5}}>Enter URL of remote rtcshare:</div>
                        <input type="text" value={editUrlText} onChange={e => setEditUrlText(e.target.value)} />
                        <button onClick={() => {
                            let url2 = editUrlText

                            // handle case where user pasted in the entire URL where sh is a query parameter
                            if (url2.startsWith('https://flatironinstitute.github.io')) {
                                // for example: https://flatironinstitute.github.io/rtcshare?sh=https://rtcshare-proxy.herokuapp.com/s/...&webrtc=1
                                const urlObj2 = new URL(url2)
                                const sh = urlObj2.searchParams.get('sh')
                                if (sh) {
                                    url2 = sh
                                }
                            }

                            const urlObj = new URL(window.location.href)
                            urlObj.searchParams.set('sh', url2)
                            window.location.href = urlObj.toString()
                        }}>Connect</button>
                        <button onClick={() => setTextEditVisible(false)}>Cancel</button>
                    </div>
                ) : (
                    <Hyperlink color="black" onClick={() => setTextEditVisible(true)}>Connect to remote rtcshare</Hyperlink>
                )
            }
        </div>
    )
}

export default HomePage