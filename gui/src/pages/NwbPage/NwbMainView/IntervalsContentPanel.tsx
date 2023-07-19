import { FunctionComponent, useMemo } from "react"
import Hyperlink from "../../../components/Hyperlink"
import '../nwb-table.css'
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "../RemoteH5File/RemoteH5File"
import { useSelectedNwbItems } from "../SelectedNwbItemsContext"
import { useGroup } from "./NwbMainView"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

const IntervalsContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
    const {selectedNwbItemPaths, toggleSelectedNwbItem} = useSelectedNwbItems()
    return (
        <div>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Item</th>
                        <th>Neurodata type</th>
                        <th>Description</th>
                        <th>Columns</th>
                        <th># Rows</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        group.subgroups.map((sg) => (
                            <GroupTableRow
                                key={sg.name}
                                nwbFile={nwbFile}
                                subgroup={sg}
                                selected={selectedNwbItemPaths.includes(sg.path)}
                                onToggleSelect={(neurodataType) => toggleSelectedNwbItem(sg.path, neurodataType)}
                            />
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

type GroupTableRowProps = {
    nwbFile: RemoteH5File
    subgroup: RemoteH5Subgroup
    selected: boolean
    onToggleSelect: (neurodataType: string) => void
}

const GroupTableRow: FunctionComponent<GroupTableRowProps> = ({nwbFile, subgroup, selected, onToggleSelect}) => {
    const group = useGroup(nwbFile, subgroup.path)
    const {openTab} = useNwbOpenTabs()
    const neurodataType = subgroup.attrs['neurodata_type']
    const colnames = useMemo(() => ((subgroup.attrs['colnames'] || []) as string[]), [subgroup])
    const numRows = useMemo(() => {
        if (!group) return undefined
        if (!colnames) return undefined
        if (colnames.length === 0) return undefined
        const d = group.datasets.find(ds => (ds.name === colnames[0]))
        if (!d) return undefined
        return d.shape[0]
    }, [group, colnames])
    return (
        <tr>
            <td>
                <input type="checkbox" checked={selected} disabled={!neurodataType} onClick={() => onToggleSelect(neurodataType)} onChange={() => {}} />
            </td>
            <td>
                <Hyperlink disabled={!neurodataType} onClick={() => openTab(`neurodata-item:${subgroup.path}|${neurodataType}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{neurodataType}</td>
            <td>{subgroup.attrs['description']}</td>
            <td>{colnames.join(', ')}</td>
            <td>{numRows}</td>
        </tr>
    )
}

export default IntervalsContentPanel