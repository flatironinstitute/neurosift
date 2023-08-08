import { FunctionComponent } from "react"
import { RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import DynamicTableView from "../viewPlugins/DynamicTable/DynamicTableView"
import ViewPluginButton from "../viewPlugins/ViewPluginButton"
import viewPlugins from "../viewPlugins/viewPlugins"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
    width: number
}

const UnitsContentPanel: FunctionComponent<Props> = ({nwbFile, group, width}) => {
    return (
        <div>
            <div>&nbsp;</div>
            <div style={{display: 'flex'}}>
                {
                    viewPlugins.filter(vp => (vp.neurodataType === 'Units')).map(vp => (
                        <div key={vp.name} style={{display: 'flex'}}>
                            <ViewPluginButton
                                viewPlugin={vp}
                                path={group.path}
                            />
                            <div>&nbsp;</div>
                        </div>
                    ))
                }
            </div>
            <div>&nbsp;</div>
            <DynamicTableView
                width={width}
                height={300}
                path={group.path}
                referenceColumnName={'id'}
            />
        </div>
    )
}

export default UnitsContentPanel