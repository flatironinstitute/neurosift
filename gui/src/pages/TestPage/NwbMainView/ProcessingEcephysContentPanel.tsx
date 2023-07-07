import { FunctionComponent, useEffect, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"
import '../nwb-table.css'
import Abbreviate from "../NwbAcquisitionItemView/Abbreviate"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "../RemoteH5File/RemoteH5File"
import { useSelectedNwbItems } from "../SelectedNwbItemsContext"
import { useGroup } from "./NwbMainView"

type Props = {
    nwbFile: RemoteH5File
}

const ProcessingEcephysContentPanel: FunctionComponent<Props> = ({nwbFile}) => {
    const group = useGroup(nwbFile, '/processing/ecephys')
    const {selectedNwbItemPaths, toggleSelectedNwbItem} = useSelectedNwbItems()
    if (!group) return <div>...</div>
    return (
        <div>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th></th>
                        <th>Item</th>
                        <th>Neurodata type</th>
                        <th>Description</th>
                        <th>Comments</th>
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
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const g = await nwbFile.getGroup(subgroup.path)
            if (canceled) return
            setGroup(g)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, subgroup.path])
    const {openTab} = useNwbOpenTabs()
    const neurodataType = group ? group.attrs['neurodata_type'] : ''
    return (
        <tr>
            <td>
            <input type="checkbox" checked={selected} disabled={!neurodataType} onClick={() => onToggleSelect(neurodataType)} onChange={() => {}} />
            </td>
            <td>
                <Hyperlink disabled={!neurodataType} onClick={() => openTab(`neurodata-item:${subgroup.path}|${neurodataType}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{group ? group.attrs['neurodata_type'] : ''}</td>
            <td>{group ? group.attrs['description'] : ''}</td>
            <td>{group ? <Abbreviate>{group.attrs['comments']}</Abbreviate> : ''}</td>
        </tr>
    )
}

export default ProcessingEcephysContentPanel