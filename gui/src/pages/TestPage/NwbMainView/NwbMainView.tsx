import { FunctionComponent, useContext, useEffect, useState } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import UnitsContentPanel from "../UnitsContentPanel"
import AcquisitionContentPanel from "./AcquisitionContentPanel"
import ProcessingBehaviorContentPanel from "./ProcessingBehaviorContentPanel"
import ProcessingEcephysContentPanel from "./ProcessingEcephysContentPanel"

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

export const useDatasetData = (nwbFile: RemoteH5File, path: string | undefined) => {
    const [data, setData] = useState<any | undefined>(undefined)
    const [dataset, setDataset] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        if (!path) return
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
    const {openTab} = useNwbOpenTabs()
    const bottomBarHeight = 27
    return (
        <div className="LeftPanel" style={{position: 'absolute', width, height}}>
            <div className="MainArea" style={{position: 'absolute', width, height: height - bottomBarHeight, overflowY: 'auto'}}>
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
            </div>
            <div className="bottomBar" style={{position: 'absolute', width, top: height - bottomBarHeight, height: bottomBarHeight, backgroundColor: '#ddd'}}>
                <button
                    style={{marginTop: 3}}
                    onClick={() => openTab('browse-nwb')}
                >
                    Browse NWB File
                </button>
            </div>
        </div>
    )
}

type MainPanelProps = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

type Heading = {
    name: string
    label: string
    groupPath: string
}

const headings: Heading[] = [
    {
        name: 'acquisition',
        label: 'acquisition',
        groupPath: '/acquisition'
    },
    {
        name: 'analysis',
        label: 'analysis',
        groupPath: '/analysis'
    },
    {
        name: 'general',
        label: 'general',
        groupPath: '/general'
    },
    {
        name: 'processing/behavior',
        label: 'processing/behavior',
        groupPath: '/processing/behavior'
    },
    {
        name: 'processing/ecephys',
        label: 'processing/ecephys',
        groupPath: '/processing/ecephys'
    },
    {
        name: 'processing/spikes',
        label: 'processing/spikes',
        groupPath: '/processing/spikes'
    },
    {
        name: 'specifications',
        label: 'specifications',
        groupPath: '/specifications'
    },
    {
        name: 'stimulus',
        label: 'stimulus',
        groupPath: '/stimulus'
    },
    {
        name: 'units',
        label: 'units',
        groupPath: '/units'
    }
]

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, nwbFile}) => {
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                headings.map((heading) => (
                    <TopLevelHeadingView
                        key={heading.name}
                        nwbFile={nwbFile}
                        heading={heading}
                    />
                ))
            }
        </div>
    )
}

type TopLevelHeadingViewProps = {
    nwbFile: RemoteH5File
    heading: Heading
}

const TopLevelHeadingView: FunctionComponent<TopLevelHeadingViewProps> = ({nwbFile, heading}) => {
    const [expanded, setExpanded] = useState(false)
    const group = useGroup(nwbFile, heading.groupPath)
    const titlePanelColor = expanded ? '#336' : '#669'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: 'white', border: 'solid 1px black'}}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▼' : '►'} {heading.label} <TopLevelTitlePanelText heading={heading} group={group} nwbFile={nwbFile} />
            </div>
            {
                expanded && group && (
                    <TopLevelContentPanel heading={heading} group={group} nwbFile={nwbFile} />
                )
            }
        </div>
    )
}

type TopLevelTitlePanelTextProps = {
    heading: Heading
    group: RemoteH5Group | undefined
    nwbFile: RemoteH5File
}

const TopLevelTitlePanelText: FunctionComponent<TopLevelTitlePanelTextProps> = ({heading, group, nwbFile}) => {
    if (!group) return <span>-</span>
    if (heading.name === 'units') {
        return <UnitsTitlePanelText heading={heading} group={group} nwbFile={nwbFile} />
    }
    else {
        return <span>({group.subgroups.length + group.datasets.length})</span>
    }
}

const UnitsTitlePanelText: FunctionComponent<TopLevelTitlePanelTextProps> = ({group, nwbFile}) => {
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

type TopLevelContentPanelProps = {
    heading: Heading
    group: RemoteH5Group
    nwbFile: RemoteH5File
}

const TopLevelContentPanel: FunctionComponent<TopLevelContentPanelProps> = ({heading, group, nwbFile}) => {
    const name = heading.name
    if (name === 'units') {
        return <UnitsContentPanel nwbFile={nwbFile} group={group} />
    }
    else if (name === 'acquisition') {
        return <AcquisitionContentPanel nwbFile={nwbFile} group={group} />
    }
    else if (name === 'processing/behavior') {
        return <ProcessingBehaviorContentPanel nwbFile={nwbFile} />
    }
    else if (name === 'processing/ecephys') {
        return <ProcessingEcephysContentPanel nwbFile={nwbFile} />
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