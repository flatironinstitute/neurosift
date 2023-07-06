import { FunctionComponent, useEffect, useReducer, useState } from "react"
import Hyperlink from "../../components/Hyperlink"
import { subgroupSelectionReducer } from "./AcquisitionContentPanel"
import './nwb-table.css'
import { useGroup } from "./NwbMainView"
import { useNwbOpenTabs } from "./NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "./RemoteH5File/RemoteH5File"

type Props = {
    nwbFile: RemoteH5File
}

const ProcessingBehaviorContentPanel: FunctionComponent<Props> = ({nwbFile}) => {
    const group = useGroup(nwbFile, '/processing/behavior')
    const [subgroupSelection, subgroupSelectionDispatch] = useReducer(subgroupSelectionReducer, [])
    const {openTab} = useNwbOpenTabs()
    if (!group) return <div>Loading...</div>
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
                                selected={subgroupSelection.includes(sg.name)}
                                onToggleSelect={() => subgroupSelectionDispatch({
                                    type: 'toggle',
                                    subgroupName: sg.name
                                })}
                            />
                        ))
                    }
                </tbody>
            </table>
            {
                subgroupSelection.length > 0 && (
                    <button
                        onClick={() => {
                            if (subgroupSelection.length === 1) {
                                openTab(`processing/behavior:${subgroupSelection[0]}`)
                            }
                            else if (subgroupSelection.length > 1) {
                                const subgroupNames = subgroupSelection.join('@')
                                openTab(`processing/behaviors:${subgroupNames}`)
                            }
                        }}
                        style={{marginTop: 5}}
                    >View {subgroupSelection.length}</button>
                )
            }
        </div>
    )
}

type GroupTableRowProps = {
    nwbFile: RemoteH5File
    subgroup: RemoteH5Subgroup
    selected: boolean
    onToggleSelect: () => void
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
    return (
        <tr>
            <td>
                <input type="checkbox" checked={selected} onClick={onToggleSelect} onChange={() => {}} />
            </td>
            <td>
                <Hyperlink onClick={() => openTab(`processing/behavior:${subgroup.name}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{group ? group.attrs['neurodata_type'] : ''}</td>
            <td>{group ? group.attrs['description'] : ''}</td>
            <td>{group ? group.attrs['comments'] : ''}</td>
        </tr>
    )
}

const formatShape = (shape: number[]) => {
    return `[${shape.join(', ')}]`
}

export default ProcessingBehaviorContentPanel