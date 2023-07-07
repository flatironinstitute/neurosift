import { FunctionComponent } from "react"
import './nwb-table.css'
import { useNwbOpenTabs } from "./NwbOpenTabsContext"
import ProcessingBehaviorContentPanel from "./ProcessingBehaviorContentPanel"
import ProcessingEcephysContentPanel from "./ProcessingEcephysContentPanel"
import { RemoteH5File, RemoteH5Group } from "./RemoteH5File/RemoteH5File"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

const ProcessingContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
    const {openTab} = useNwbOpenTabs()
    const hasBehavior = group.subgroups.filter(sg => (sg.name === 'behavior')).length > 0
    const hasEcephys = group.subgroups.filter(sg => (sg.name === 'ecephys')).length > 0
    return (
        <div>
            <div style={{fontWeight: 'bold', paddingTop: 20, paddingBottom: 5}}>Behavior</div>
            {hasBehavior && <ProcessingBehaviorContentPanel nwbFile={nwbFile} />}
            <div style={{fontWeight: 'bold', paddingTop: 20, paddingBottom: 5}}>Ecephys</div>
            {hasEcephys && <ProcessingEcephysContentPanel nwbFile={nwbFile} />}
            <div style={{fontWeight: 'bold', paddingTop: 20, paddingBottom: 5}}>Other</div>
            {
                group.subgroups.filter(sg => (!['behavior', 'ecephys'].includes(sg.name))).map((sg) => (
                    <div key={sg.name}>{sg.name}</div>
                ))
            }
        </div>
    )
}

export default ProcessingContentPanel