import { FunctionComponent, useEffect, useState } from "react"
import { RemoteH5File, RemoteH5Group } from "./RemoteH5File/RemoteH5File"
import UnitsContentPanel_Wasm from "./UnitsContentPanel_Wasm"

type Props = {
    width: number
    height: number
    nwbFile: RemoteH5File
}

const NwbView_Wasm: FunctionComponent<Props> = ({width, height, nwbFile}) => {
    const [topLevelGroupNames, setTopLevelGroupNames] = useState<string[] | undefined>(undefined)
    const [topLevelDatasetNames, setTopLevelDatasetNames] = useState<string[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const {groups, datasets} = await nwbFile.getGroup('/')
            if (canceled) return
            setTopLevelGroupNames(groups.map(g => (g.name)))
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
        return <span>({group.groups.length + group.datasets.length})</span>
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
        return <UnitsContentPanel_Wasm nwbFile={nwbFile} group={group} />
    }
    return (
        <div style={{marginLeft: 10}}>
            {
                group.groups.map((g) => (
                    <div key={g.name}>
                        {g.name}
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

export default NwbView_Wasm