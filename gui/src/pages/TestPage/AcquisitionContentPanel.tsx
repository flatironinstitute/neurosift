import { FunctionComponent, useEffect, useReducer, useState } from "react"
import Hyperlink from "../../components/Hyperlink"
import './nwb-table.css'
import { Abbreviate } from "./NwbAcquisitionItemView/NwbAcquisitionItemView"
import { useNwbOpenTabs } from "./NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "./RemoteH5File/RemoteH5File"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

export type SubgroupSelectionState = string[]

export type SubgroupSelectionAction = {
    type: 'toggle'
    subgroupName: string
}

export const subgroupSelectionReducer = (state: SubgroupSelectionState, action: SubgroupSelectionAction): SubgroupSelectionState => {
    if (action.type === 'toggle') {
        if (state.includes(action.subgroupName)) {
            return state.filter(s => (s !== action.subgroupName))
        }
        else {
            return [...state, action.subgroupName].sort()
        }
    }
    else {
        return state
    }
}

const AcquisitionContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
    const [subgroupSelection, subgroupSelectionDispatch] = useReducer(subgroupSelectionReducer, [])
    const {openTab} = useNwbOpenTabs()
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
                        <th>Data</th>
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
                                openTab(`acquisition:${subgroupSelection[0]}`)
                            }
                            else if (subgroupSelection.length > 1) {
                                const subgroupNames = subgroupSelection.join('@')
                                openTab(`acquisitions:${subgroupNames}`)
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
    const [data, setData] = useState<RemoteH5Dataset | undefined>(undefined)
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
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const d = await nwbFile.getDataset(`${subgroup.path}/data`)
            if (canceled) return
            setData(d)
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
                <Hyperlink onClick={() => openTab(`acquisition:${subgroup.name}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{group ? group.attrs['neurodata_type'] : ''}</td>
            <td>{group ? group.attrs['description'] : ''}</td>
            <td>{group ? <Abbreviate>{group.attrs['comments']}</Abbreviate> : ''}</td>
            <td>{data ? `${data.dtype} ${formatShape(data.shape)}` : ''}</td>
        </tr>
    )
}

const formatShape = (shape: number[]) => {
    return `[${shape.join(', ')}]`
}

// const serializeBigInt = (x: any): any => {
//     if (typeof(x) === 'bigint') {
//         return x.toString()
//     }
//     else if (typeof(x) === 'object') {
//         if (Array.isArray(x)) {
//             return x.map(serializeBigInt)
//         }
//         else {
//             const ret: {[key: string]: any} = {}
//             for (const key in x) {
//                 ret[key] = serializeBigInt(x[key])
//             }
//             return ret
//         }
//     }
//     else {
//         return x
//     }
// }

export default AcquisitionContentPanel