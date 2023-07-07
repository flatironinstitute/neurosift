import { FunctionComponent, useEffect, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"
import '../nwb-table.css'
import Abbreviate from "../NwbAcquisitionItemView/Abbreviate"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "../RemoteH5File/RemoteH5File"
import { useSelectedNwbItems } from "../SelectedNwbItemsContext"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

const AcquisitionContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
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
    const neurodataType = group ? group.attrs['neurodata_type'] : ''
    return (
        <tr>
            <td>
                <input type="checkbox" checked={selected} disabled={!neurodataType} onClick={() => onToggleSelect(neurodataType)} onChange={() => {}} />
            </td>
            <td>
                <Hyperlink disabled={!neurodataType} onClick={() => openTab(`neurodata-item:${subgroup.path}|${neurodataType}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{neurodataType}</td>
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