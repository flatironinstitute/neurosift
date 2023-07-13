import { FunctionComponent } from "react"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5File } from "../RemoteH5File/RemoteH5File"
import { useDatasetData, useGroup } from "./NwbMainView"
import SelectedNeurodataItemsWidget from "./SelectedNeurodataItemsWidget"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

const NwbMainLeftPanel: FunctionComponent<Props> = ({width, height, nwbFile}) => {
    const rootGroup = useGroup(nwbFile, '/')
    const {data: fileCreateDateData} = useDatasetData(nwbFile, '/file_create_date')
    const {data: sessionStartTimeData} = useDatasetData(nwbFile, '/session_start_time')
    const {data: timestampsReferenceTimeData} = useDatasetData(nwbFile, '/timestamps_reference_time')
    const {data: sessionDescriptionData} = useDatasetData(nwbFile, '/session_description')
    const {data: identifierData} = useDatasetData(nwbFile, '/identifier')
    const {data: experimenterData} = useDatasetData(nwbFile, '/general/experimenter')
    const {data: institutionData} = useDatasetData(nwbFile, '/general/institution')
    const {data: labData} = useDatasetData(nwbFile, '/general/lab')
    const {data: relatedPublicationsData} = useDatasetData(nwbFile, '/general/related_publications')
    const {data: sessionIdData} = useDatasetData(nwbFile, '/general/session_id')
    const {openTab} = useNwbOpenTabs()
    const bottomBarHeight = 27
    return (
        <div className="LeftPanel" style={{position: 'absolute', width, height}}>
            <div className="MainArea" style={{position: 'absolute', width, height: height - bottomBarHeight, overflowY: 'auto'}}>
                <table
                    className="nwb-table"
                >
                    <tbody>
                        <tr>
                            <td>Session ID</td>
                            <td>{sessionIdData || ''}</td>
                        </tr>
                        <tr>
                            <td>Experimenter</td>
                            <td>{experimenterData || ''}</td>
                        </tr>
                        <tr>
                            <td>Lab</td>
                            <td>{labData || ''}</td>
                        </tr>
                        <tr>
                            <td>Institution</td>
                            <td>{institutionData || ''}</td>
                        </tr>
                        <tr>
                            <td>Related publications</td>
                            <td>{relatedPublicationsData || ''}</td>
                        </tr>
                        <tr>
                            <td>Description</td>
                            <td>{sessionDescriptionData || ''}</td>
                        </tr>
                        <tr>
                            <td>Identifier</td>
                            <td>{identifierData || ''}</td>
                        </tr>
                        <tr>
                            <td>Session start</td>
                            <td>{sessionStartTimeData || ''}</td>
                        </tr>
                        <tr>
                            <td>Timestamps ref.</td>
                            <td>{timestampsReferenceTimeData || ''}</td>
                        </tr>

                        <tr>
                            <td>File creation</td>
                            <td>{fileCreateDateData ? fileCreateDateData[0] : ''}</td>
                        </tr>
                        <tr>
                            <td>nwb_version</td>
                            <td>{rootGroup?.attrs['nwb_version']}</td>
                        </tr>
                    </tbody>
                </table>
                <hr />
                <SelectedNeurodataItemsWidget />
            </div>
        </div>
    )
}

export default NwbMainLeftPanel