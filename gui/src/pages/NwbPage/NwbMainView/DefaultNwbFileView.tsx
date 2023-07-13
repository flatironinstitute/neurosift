import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import UnitsContentPanel from "../UnitsContentPanel"
import AcquisitionContentPanel from "./AcquisitionContentPanel"
import { useGroup } from "./NwbMainView"
import ProcessingGroupContentPanel from "./ProcessingGroupContentPanel"
import SpecificationsContentPanel from "./SpecificationsContentPanel"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

type Heading = {
    name: string
    label: string
    groupPath: string
}

const DefaultNwbFileView: FunctionComponent<Props> = ({width, height, nwbFile}) => {
    const processingGroup = useGroup(nwbFile, '/processing')
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

        if (processingGroup) {
            processingGroup.subgroups.forEach(sg => {
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
    }, [processingGroup])
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
    // const titlePanelColor = expanded ? '#336' : '#669'
    const titlePanelColor = expanded ? '#a67c00' : '#feb'
    const titleColor = expanded ? '#feb' : '#865c00'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: titleColor, border: 'solid 1px black'}}
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

export default DefaultNwbFileView