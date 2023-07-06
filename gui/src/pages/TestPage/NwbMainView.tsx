import { FunctionComponent, useContext, useEffect, useState } from "react"
import Splitter from "../../components/Splitter"
import AcquisitionContentPanel from "./AcquisitionContentPanel"
import { NwbFileContext } from "./NwbFileContext"
import ProcessingContentPanel from "./ProcessingContentPanel"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "./RemoteH5File/RemoteH5File"
import UnitsContentPanel from "./UnitsContentPanel"

type Props = {
    width: number
    height: number
}

const NwbMainView: FunctionComponent<Props> = ({width, height}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    return (
        <Splitter
            direction="horizontal"
            initialPosition={Math.min(500, width / 3)}
            width={width}
            height={height}
        >
            <LeftPanel
                width={0}
                height={0}
                nwbFile={nwbFile}
            />
            <MainPanel
                width={0}
                height={0}
                nwbFile={nwbFile}
            />
        </Splitter>
    )
}

type LeftPanelProps = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

export const useGroup = (nwbFile: RemoteH5File, path: string) => {
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const grp = await nwbFile.getGroup(path)
            if (canceled) return
            setGroup(grp)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return group
}

export const useDataset = (nwbFile: RemoteH5File, path: string) => {
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const ds = await nwbFile.getDataset(path)
            if (canceled) return
            setDataset(ds)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return dataset
}

export const useDatasetData = (nwbFile: RemoteH5File, path: string) => {
    const [data, setData] = useState<any | undefined>(undefined)
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const ds = await nwbFile.getDataset(path)
            if (canceled) return
            setDataset(ds)
            const d = await nwbFile.getDatasetData(path, {})
            if (canceled) return
            setData(d)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])
    return {dataset, data}
}

const LeftPanel: FunctionComponent<LeftPanelProps> = ({width, height, nwbFile}) => {
    const rootGroup = useGroup(nwbFile, '/')
    const {data: fileCreateDateData} = useDatasetData(nwbFile, '/file_create_date')
    const {data: sessionStartTimeData} = useDatasetData(nwbFile, '/session_start_time')
    const {data: timestampsReferenceTimeData} = useDatasetData(nwbFile, '/timestamps_reference_time')
    const {data: sessionDescriptionData} = useDatasetData(nwbFile, '/session_description')
    const {data: identifierData} = useDatasetData(nwbFile, '/identifier')
    const {data: experimenterData} = useDatasetData(nwbFile, '/general/experimenter')
    const {data: institutionData} = useDatasetData(nwbFile, '/general/institution')
    const {data: labData} = useDatasetData(nwbFile, '/general/lab')
    const {data: relatedPublicationsData} = useDatasetData(nwbFile, '/general/related_publications')
    const {data: sessionIdData} = useDatasetData(nwbFile, '/general/session_id')
    return (
        <table
            className="nwb-table"
        >
            <tbody>
                <tr>
                    <td>Session ID</td>
                    <td>{sessionIdData || ''}</td>
                </tr>
                <tr>
                    <td>Experimenter</td>
                    <td>{experimenterData || ''}</td>
                </tr>
                <tr>
                    <td>Lab</td>
                    <td>{labData || ''}</td>
                </tr>
                <tr>
                    <td>Institution</td>
                    <td>{institutionData || ''}</td>
                </tr>
                <tr>
                    <td>Related publications</td>
                    <td>{relatedPublicationsData || ''}</td>
                </tr>
                <tr>
                    <td>Description</td>
                    <td>{sessionDescriptionData || ''}</td>
                </tr>
                <tr>
                    <td>Identifier</td>
                    <td>{identifierData || ''}</td>
                </tr>
                <tr>
                    <td>Session start</td>
                    <td>{sessionStartTimeData || ''}</td>
                </tr>
                <tr>
                    <td>Timestamps ref.</td>
                    <td>{timestampsReferenceTimeData || ''}</td>
                </tr>

                <tr>
                    <td>File creation</td>
                    <td>{fileCreateDateData ? fileCreateDateData[0] : ''}</td>
                </tr>
                <tr>
                    <td>nwb_version</td>
                    <td>{rootGroup?.attrs['nwb_version']}</td>
                </tr>
            </tbody>
        </table>
    )
}

type MainPanelProps = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, nwbFile}) => {
    const [topLevelGroupNames, setTopLevelGroupNames] = useState<string[] | undefined>(undefined)
    const [topLevelDatasetNames, setTopLevelDatasetNames] = useState<string[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const {subgroups, datasets} = await nwbFile.getGroup('/')
            if (canceled) return
            setTopLevelGroupNames(subgroups.map(sg => (sg.name)))
            setTopLevelDatasetNames(datasets.map(d => (d.name)))
        }
        load()
        return () => {canceled = true}
    }, [nwbFile])
    if (!topLevelGroupNames) return <div>Loading...</div>
    if (!topLevelDatasetNames) return <div>Loading......</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                topLevelGroupNames.map((name) => (
                    <TopLevelGroupView
                        key={name}
                        nwbFile={nwbFile}
                        name={name}
                    />
                ))
            }
            {
                topLevelDatasetNames.map((name) => (
                    <TopLevelDatasetView
                        key={name}
                        nwbFile={nwbFile}
                        name={name}
                    />
                ))
            }
        </div>
    )
        }

type TopLevelGroupViewProps = {
    nwbFile: RemoteH5File
    name: string
}

const TopLevelGroupView: FunctionComponent<TopLevelGroupViewProps> = ({nwbFile, name}) => {
    const [expanded, setExpanded] = useState(false)
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const group = await nwbFile.getGroup('/' + name)
            if (canceled) return
            setGroup(group)
        }
        load()
        return () => {canceled = true}
    }, [expanded, name, nwbFile])
    const titlePanelColor = expanded ? '#336' : '#669'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: 'white', border: 'solid 1px black'}}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▼' : '►'} {name} <TitlePanelText name={name} group={group} nwbFile={nwbFile} />
            </div>
            {
                expanded && group && (
                    <ContentPanel name={name} group={group} nwbFile={nwbFile} />
                )
            }
        </div>
    )
}

type TopLevelDatasetViewProps = {
    nwbFile: RemoteH5File
    name: string
}

const TopLevelDatasetView: FunctionComponent<TopLevelDatasetViewProps> = ({nwbFile, name}) => {
    const titlePanelColor = '#777'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: 'white', border: 'solid 1px black'}}
            >
                {' '} {name} <TitlePanelText name={name} group={undefined} nwbFile={nwbFile} />
            </div>
        </div>
    )
}

type TitlePanelTextProps = {
    name: string
    group: RemoteH5Group | undefined
    nwbFile: RemoteH5File
}

const TitlePanelText: FunctionComponent<TitlePanelTextProps> = ({name, group, nwbFile}) => {
    if (!group) return <span>-</span>
    if (name === 'units') {
        return <UnitsTitlePanelText name={name} group={group} nwbFile={nwbFile} />
    }
    else {
        return <span>({group.subgroups.length + group.datasets.length})</span>
    }
}

const UnitsTitlePanelText: FunctionComponent<TitlePanelTextProps> = ({group, nwbFile}) => {
    const [numUnits, setNumUnits] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (!group) return
        if (group.datasets.filter(ds => (ds.name === 'id')).length === 0) return
        let canceled = false
        const load = async () => {
            const ids = await nwbFile.getDatasetData(`${group.path}/id`, {})
            if (canceled) return
            setNumUnits(ids.length)
        }
        load()
        return () => {canceled = true}
    }, [group, nwbFile])
    if (numUnits === undefined) return <span>...</span>
    return <span>({numUnits} units)</span>
}

type ContentPanelProps = {
    name: string
    group: RemoteH5Group
    nwbFile: RemoteH5File
}

const ContentPanel: FunctionComponent<ContentPanelProps> = ({name, group, nwbFile}) => {
    if (name === 'units') {
        return <UnitsContentPanel nwbFile={nwbFile} group={group} />
    }
    else if (name === 'acquisition') {
        return <AcquisitionContentPanel nwbFile={nwbFile} group={group} />
    }
    else if (name === 'processing') {
        return <ProcessingContentPanel nwbFile={nwbFile} group={group} />
    }
    return (
        <div style={{marginLeft: 10}}>
            {
                group.subgroups.map((sg) => (
                    <div key={sg.name}>
                        {sg.name}
                    </div>
                ))
            }
            {
                group.datasets.map((d) => (
                    <div key={d.name}>
                        DS: {d.name}
                    </div>
                ))
            }
        </div>
    )
}

export default NwbMainView