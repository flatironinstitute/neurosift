import { FunctionComponent, useContext, useEffect, useMemo, useState } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import UnitsContentPanel from "../UnitsContentPanel"
import AcquisitionContentPanel from "./AcquisitionContentPanel"
import NwbMainLeftPanel from "./NwbMainLeftPanel"
import ProcessingGroupContentPanel from "./ProcessingGroupContentPanel"
import SpecificationsContentPanel from "./SpecificationsContentPanel"

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
            <NwbMainLeftPanel
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

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, nwbFile}) => {
    const processinGroup = useGroup(nwbFile, '/processing')
    const headings = useMemo(() => {
        const hh: Heading[] = []
        hh.push({
            name: 'acquisition',
            label: 'acquisition',
            groupPath: '/acquisition'
        })
        hh.push({
            name: 'analysis',
            label: 'analysis',
            groupPath: '/analysis'
        })
        hh.push({
            name: 'general',
            label: 'general',
            groupPath: '/general'
        })

        if (processinGroup) {
            processinGroup.subgroups.forEach(sg => {
                hh.push({
                    name: `processing/${sg.name}`,
                    label: `processing/${sg.name}`,
                    groupPath: `/processing/${sg.name}`
                })
            })
        }

        hh.push({
            name: 'specifications',
            label: 'specifications',
            groupPath: '/specifications'
        })
        hh.push({
            name: 'stimulus',
            label: 'stimulus',
            groupPath: '/stimulus'
        })
        hh.push({
            name: 'units',
            label: 'units',
            groupPath: '/units'
        })
        return hh
    }, [processinGroup])
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
    else if (name.startsWith('processing/')) {
        return <ProcessingGroupContentPanel nwbFile={nwbFile} groupPath={heading.groupPath} />
    }
    else if (name === 'specifications') {
        return <SpecificationsContentPanel nwbFile={nwbFile} />
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

export default NwbMainView