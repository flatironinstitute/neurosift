/* eslint-disable @typescript-eslint/no-explicit-any */
import { RemoteH5FileX, RemoteH5Group } from "@remote-h5-file/index"
import { FunctionComponent, useState } from "react"
import { useNwbFile } from "../NwbFileContext"
import { useGroup } from "../NwbMainView/NwbMainView"
import TopLevelGroupContentPanel from "./TopLevelGroupContentPanel"
import './nwb-attributes-table.css'

type Props = {
    width: number
    height: number
}

const BrowseNwbView: FunctionComponent<Props> = ({width, height}) => {
    const nwbFile = useNwbFile()
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    return (
        <MainPanel
            width={width}
            height={height}
            nwbFile={nwbFile}
        />
    )
}

type MainPanelProps = {
    width: number
    height: number
    nwbFile: RemoteH5FileX
}

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, nwbFile}) => {
    const rootGroup = useGroup(nwbFile, '/')
    if (!rootGroup) return <div>Loading...</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                rootGroup.subgroups.map((sg) => (
                    <TopLevelGroupView
                        key={sg.name}
                        nwbFile={nwbFile}
                        name={sg.name}
                    />
                ))
            }
            <hr />
            <TopLevelGroupContentPanel name={'/'} group={rootGroup} nwbFile={nwbFile} excludeGroups={true} />
            {/* {
                rootGroup.datasets.map((ds) => (
                    <TopLevelDatasetView
                        key={ds.name}
                        nwbFile={nwbFile}
                        name={ds.name}
                    />
                ))
            }
            <hr />
            {
                <AttributesView
                    attrs={rootGroup.attrs}
                />
            } */}
        </div>
    )
}

type TopLevelGroupViewProps = {
    nwbFile: RemoteH5FileX
    name: string
}

const TopLevelGroupView: FunctionComponent<TopLevelGroupViewProps> = ({nwbFile, name}) => {
    const [expanded, setExpanded] = useState(false)
    const group = useGroup(nwbFile, '/' + name)
    const titlePanelBackgroundColor = expanded ? '#797' : '#8a8'
    const titlePanelTextColor = expanded ? 'white' : '#fff'
    const expandable = group && (group.subgroups.length > 0 || group.datasets.length > 0)
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelBackgroundColor, color: titlePanelTextColor, border: 'solid 1px black'}}
                onClick={() => expandable && setExpanded(!expanded)}
            >
                {expandable ? (expanded ? '▼' : '►') : <>&nbsp;&nbsp;&nbsp;</>} {name} <GroupTitlePanelText name={name} group={group} nwbFile={nwbFile} />
            </div>
            {
                expanded && group && (
                    <TopLevelGroupContentPanel name={name} group={group} nwbFile={nwbFile} />
                )
            }
        </div>
    )
}

// type TopLevelDatasetViewProps = {
//     nwbFile: RemoteH5FileX
//     name: string
// }

// const TopLevelDatasetView: FunctionComponent<TopLevelDatasetViewProps> = ({nwbFile, name}) => {
//     const [expanded, setExpanded] = useState(false)
//     const dataset = useDataset(nwbFile, '/' + name)
//     const titlePanelBackgroundColor = expanded ? '#666' : '#777'
//     const titlePanelTextColor = expanded ? 'white' : '#fff'
//     return (
//         <div style={{marginLeft: 10}}>
//             <div
//                 style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelBackgroundColor, color: titlePanelTextColor, border: 'solid 1px black'}}
//                 onClick={() => setExpanded(!expanded)}
//             >
//                 {expanded ? '▼' : '►'} {name} <DatasetTitlePanelText name={name} dataset={dataset} nwbFile={nwbFile} />
//             </div>
//             {
//                 expanded && dataset && (
//                     <TopLevelDatasetContentPanel name={name} dataset={dataset} nwbFile={nwbFile} />
//                 )
//             }
//         </div>
//     )
// }

type GroupTitlePanelTextProps = {
    name: string
    group: RemoteH5Group | undefined
    nwbFile: RemoteH5FileX
}

const GroupTitlePanelText: FunctionComponent<GroupTitlePanelTextProps> = ({name, group, nwbFile}) => {
    if (!group) return <span>-</span>
    return <span>({group.subgroups.length + group.datasets.length})</span>
}

// type DatasetTitlePanelTextProps = {
//     name: string
//     dataset: RemoteH5Dataset | undefined
//     nwbFile: RemoteH5FileX
// }

// const DatasetTitlePanelText: FunctionComponent<DatasetTitlePanelTextProps> = ({name, dataset, nwbFile}) => {
//     if (!dataset) return <span>-</span>
//     return <span> (dtype: {dataset.dtype}; shape: {valueToElement(dataset.shape)})</span>
// }

// type TopLevelDatasetContentPanelProps = {
//     name: string
//     dataset: RemoteH5Dataset
//     nwbFile: RemoteH5FileX
// }

// const TopLevelDatasetContentPanel: FunctionComponent<TopLevelDatasetContentPanelProps> = ({name, nwbFile, dataset}) => {
//     const shape = dataset ? dataset.shape : undefined
//     const {data} = useDatasetData(nwbFile, shape !== undefined && product(shape) <= 100 ? '/' + name : undefined)
//     return (
//         <div>
//             <div>&nbsp;</div>
//             {
//                 data ? valueToElement(data) : ''
//             }
//             <hr />
//             <AttributesView
//                 attrs={dataset.attrs}
//             />
//             <div>&nbsp;</div>
//         </div>
//     )
// }

// const AttributesView: FunctionComponent<{attrs: {[key: string]: any}}>= ({attrs}) => {
//         return (
//             <div style={{marginLeft: 10, marginRight: 10}}>
//                 <table className="nwb-attributes-table">
//                     <thead>
//                         <tr>
//                             <th>Attribute</th>
//                             <th>Value</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//                         {
//                             Object.keys(attrs).sort().map((key: string) => (
//                                 <tr key={key}>
//                                     <td>{key}</td>
//                                     <td>{valueToElement(attrs[key])}</td>
//                                 </tr>
//                             ))
//                         }
//                     </tbody>
//                 </table>
//             </div>
//         )
// }

export const valueToElement = (val: any): any => {
    if (typeof(val) === 'string') {
        return val
    }
    else if (typeof(val) === 'number') {
        return val + ''
    }
    else if (typeof(val) === 'boolean') {
        return val ? 'true' : 'false'
    }
    else if (typeof(val) === 'object') {
        if (Array.isArray(val)) {
            if (val.length < 200) {
                return `[${val.map(x => valueToElement(x)).join(', ')}]`
            }
            else {
                return `[${val.slice(0, 200).map(x => valueToElement(x)).join(', ')} ...]`
            }
        }
        // check for Float64Array, Int32Array, etc.
        else if (val.constructor && ['Float64Array', 'Int32Array', 'Uint32Array', 'Uint8Array', 'Uint16Array', 'Int8Array', 'Int16Array'].includes(val.constructor.name)) {
            const array = Array.from(val)
            return valueToElement(array)
        }
        else {
            if ('_REFERENCE' in val) {
                return <ReferenceComponent value={val['_REFERENCE']} />
            }
            else {
                return JSON.stringify(serializeBigInt(val))
            }
        }
    }
    else {
        return '<>'
    }
}

type ReferenceValue = {
    path: string
    object_id: string
    source: string
    source_object_id: string
}

export const ReferenceComponent: FunctionComponent<{value: ReferenceValue}> = ({value}) => {
    return (
        <span
            style={{color: 'darkgreen'}}
            title={JSON.stringify(value)}
        >
            {value.path}
        </span>
    )
}

// const product = (arr: number[]) => {
//     let ret = 1
//     for (const val of arr) {
//         ret = ret * val
//     }
//     return ret
// }

export const serializeBigInt = (val: any): any => {
    if (typeof(val) === 'bigint') {
        // convert to number
        return Number(val)
    }
    else if (typeof(val) === 'object') {
        if (Array.isArray(val)) {
            return val.map(x => serializeBigInt(x))
        }
        else {
            const ret: {[key: string]: any} = {}
            for (const key in val) {
                ret[key] = serializeBigInt(val[key])
            }
            return ret
        }
    }
    else {
        return val
    }
}

export default BrowseNwbView