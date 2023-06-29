import { FunctionComponent, useEffect, useState } from "react"
import UnitsContentPanel from "./UnitsContentPanel"

type Props = {
    width: number
    height: number
    nwbFile: any
}

export class NwbFileWrapper {
    constructor(private nwbFile: any) {
    }
    get topLevelGroupNames(): string[] {
        return Object.keys(this.nwbFile)
    }
    async loadGroup(name: string): Promise<NwbFileGroup> {
        const obj = await this.nwbFile[name]
        return new NwbFileGroup(obj)
    }
}

export class NwbFileGroup {
    constructor(private obj: any) {
    }
    get objectNames(): string[] {
        return Object.keys(this.obj)
    }
    async loadArray(name: string): Promise<any> {
        let x = await this.obj[name]
        // check if x is a BigInt64Array
        if (x && x.constructor && x.constructor.name === 'BigInt64Array') {
            // convert to Int32Array
            const y = new Int32Array(x.length)
            for (let i = 0; i < x.length; i++) {
                y[i] = Number(x[i])
            }
            x = y
        }
        // check if x is a BigUint64Array
        if (x && x.constructor && x.constructor.name === 'BigUint64Array') {
            // convert to Uint32Array
            const y = new Uint32Array(x.length)
            for (let i = 0; i < x.length; i++) {
                y[i] = Number(x[i])
            }
            x = y
        }
        return x
    }
}

const NwbView: FunctionComponent<Props> = ({width, height, nwbFile}) => {
    const [nwbFileWrapper, setNwbFileWrapper] = useState<NwbFileWrapper | undefined>(undefined)
    useEffect(() => {
        setNwbFileWrapper(new NwbFileWrapper(nwbFile))
    }, [nwbFile])
    if (!nwbFileWrapper) return <div>Loading...</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                nwbFileWrapper.topLevelGroupNames.map((name) => (
                    <TopLevelGroupView
                        key={name}
                        nwbFileWrapper={nwbFileWrapper}
                        name={name}
                    />
                ))
            }
        </div>
    )
}

type TopLevelGroupViewProps = {
    nwbFileWrapper: NwbFileWrapper
    name: string
}

const TopLevelGroupView: FunctionComponent<TopLevelGroupViewProps> = ({nwbFileWrapper, name}) => {
    const [expanded, setExpanded] = useState(false)
    const [group, setGroup] = useState<NwbFileGroup | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const group = await nwbFileWrapper.loadGroup(name)
            if (canceled) return
            setGroup(group)
        }
        load()
        return () => {canceled = true}
    }, [expanded, name, nwbFileWrapper])
    const titlePanelColor = expanded ? '#336' : '#669'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: 'white', border: 'solid 1px black'}}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▼' : '►'} {name} <TitlePanelText name={name} group={group} nwbFileWrapper={nwbFileWrapper} />
            </div>
            {
                expanded && group && (
                    <ContentPanel name={name} group={group} nwbFileWrapper={nwbFileWrapper} />
                )
            }
        </div>
    )
}

type TitlePanelTextProps = {
    name: string
    group: NwbFileGroup | undefined
    nwbFileWrapper: NwbFileWrapper
}

const TitlePanelText: FunctionComponent<TitlePanelTextProps> = ({name, group, nwbFileWrapper}) => {
    if (!group) return <span>-</span>
    if (name === 'units') {
        return <UnitsTitlePanelText name={name} group={group} nwbFileWrapper={nwbFileWrapper} />
    }
    else {
        return <span>({group.objectNames.length})</span>
    }
}

const UnitsTitlePanelText: FunctionComponent<TitlePanelTextProps> = ({group, nwbFileWrapper}) => {
    const [numUnits, setNumUnits] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (!group) return
        if (group.objectNames.filter(name => (name === 'id')).length === 0) return
        let canceled = false
        const load = async () => {
            const ids = await group.loadArray('id') 
            if (canceled) return
            setNumUnits(ids.length)
        }
        load()
        return () => {canceled = true}
    }, [group])
    if (numUnits === undefined) return <span>...</span>
    return <span>({numUnits} units)</span>
}

type ContentPanelProps = {
    name: string
    group: NwbFileGroup
    nwbFileWrapper: NwbFileWrapper
}

const ContentPanel: FunctionComponent<ContentPanelProps> = ({name, group, nwbFileWrapper}) => {
    if (name === 'units') {
        return <UnitsContentPanel group={group} />
    }
    return (
        <div style={{marginLeft: 10}}>
            {
                group.objectNames.map((name) => (
                    <div key={name}>
                        {name}
                    </div>
                ))
            }
        </div>
    )
}

export default NwbView