import { FunctionComponent, useEffect, useState } from "react"
import Hyperlink from "../../components/Hyperlink"
import './nwb-table.css'
import { useNwbOpenTabs } from "./NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group, RemoteH5Subgroup } from "./RemoteH5File/RemoteH5File"

type Props = {
    nwbFile: RemoteH5File
    group: RemoteH5Group
}

const AcquisitionContentPanel: FunctionComponent<Props> = ({nwbFile, group}) => {
    return (
        <table className="nwb-table">
            <thead>
                <tr>
                    <th>Item</th>
                    <th>Neurodata type</th>
                    <th>Description</th>
                    <th>Comments</th>
                    <th>Data</th>
                </tr>
            </thead>
            <tbody>
                {
                    group.subgroups.map((sg, ii) => (
                        <GroupTableRow
                            key={ii}
                            nwbFile={nwbFile}
                            subgroup={sg}
                        />
                    ))
                }
            </tbody>
        </table>
    )
}

type GroupTableRowProps = {
    nwbFile: RemoteH5File
    subgroup: RemoteH5Subgroup
}

const GroupTableRow: FunctionComponent<GroupTableRowProps> = ({nwbFile, subgroup}) => {
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
                <Hyperlink onClick={() => openTab(`acquisition:${subgroup.name}`)}>{subgroup.name}</Hyperlink>
            </td>
            <td>{group ? group.attrs['neurodata_type'] : ''}</td>
            <td>{group ? group.attrs['description'] : ''}</td>
            <td>{group ? group.attrs['comments'] : ''}</td>
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