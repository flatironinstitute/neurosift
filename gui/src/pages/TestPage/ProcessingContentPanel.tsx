import { FunctionComponent, useEffect, useReducer, useState } from "react"
import Hyperlink from "../../components/Hyperlink"
import './nwb-table.css'
import { useGroup } from "./NwbMainView"
import { useNwbOpenTabs } from "./NwbOpenTabsContext"
import ProcessingBehaviorContentPanel from "./ProcessingBehaviorContentPanel"
import ProcessingEcephysContentPanel from "./ProcessingEcephysContentPanel"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "./RemoteH5File/RemoteH5File"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

const ProcessingContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
    const {openTab} = useNwbOpenTabs()
    return (
        <div>
            <div style={{fontWeight: 'bold', paddingTop: 20, paddingBottom: 5}}>Behavior</div>
            <ProcessingBehaviorContentPanel nwbFile={nwbFile} />
            <div style={{fontWeight: 'bold', paddingTop: 20, paddingBottom: 5}}>Ecephys</div>
            <ProcessingEcephysContentPanel nwbFile={nwbFile} />
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