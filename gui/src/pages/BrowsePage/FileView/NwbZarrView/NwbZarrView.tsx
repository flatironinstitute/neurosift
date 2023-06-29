import { FunctionComponent, useEffect, useMemo, useState } from "react"
import RtcshareFileSystemClient from "../../../../rtcshare/RtcshareDataManager/RtcshareFileSystemClient"
import { useRtcshare } from "../../../../rtcshare/useRtcshare"
import ZarrArrayClient from "../../../zarr/ZarrArrayClient"
import UnitsContentPanel from "./UnitsContentPanel"

type Props = {
    width: number
    height: number
    path: string
}

type ZarrGroup = {
    objects: {name: string}[]
    attrs: {[key: string]: any}
}

export class ZarrClient {
    constructor(private path: string, private rtcshareClient: RtcshareFileSystemClient) {
    }
    async readGroup(name: string): Promise<ZarrGroup> {
        const ret: ZarrGroup = {
            objects: [],
            attrs: {}
        }
        const path2 = join(this.path, name)
        const dir = await this.rtcshareClient.readDir(path2)
        for (const a of dir.dirs) {
            if (!a.name.startsWith('.')) {
                ret.objects.push({name: a.name})
            }
            else if (a.name === '.attrs') {
                const buf = await this.rtcshareClient.readFile(`${path2}/${a.name}`)
                const attrs = JSON.parse(new TextDecoder().decode(buf))
                ret.attrs = attrs
            }
        }
        return ret
    }
    getArrayClient(name: string): ZarrArrayClient {
        return new ZarrArrayClient(`rtcshare://${this.path}`, name, this.rtcshareClient)
    }
}

const NwbZarrView: FunctionComponent<Props> = ({width, height, path}) => {
    const {client: rtcshareClient} = useRtcshare()
    const zarrClient = useMemo(() => {
        if (!rtcshareClient) return undefined
        return new ZarrClient(path, rtcshareClient)
    }, [path, rtcshareClient])
    const [topLevelGroup, setTopLevelGroup] = useState<ZarrGroup | undefined>(undefined)

    useEffect(() => {
        if (!zarrClient) return
        let canceled = false
        const load = async () => {
            const group = await zarrClient.readGroup('')
            if (canceled) return
            setTopLevelGroup(group)
        }
        load()
        return () => {canceled = true}
    }, [zarrClient])
    if (!zarrClient) return <div>Loading...</div>
    if (!topLevelGroup) return <div>Loading......</div>
    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                topLevelGroup.objects.map((obj) => (
                    <TopLevelGroupView
                        key={obj.name}
                        zarrClient={zarrClient}
                        name={obj.name}
                    />
                ))
            }
        </div>
    )
}

type TopLevelGroupViewProps = {
    zarrClient: ZarrClient
    name: string
}

const TopLevelGroupView: FunctionComponent<TopLevelGroupViewProps> = ({zarrClient, name}) => {
    const [expanded, setExpanded] = useState(false)
    const [group, setGroup] = useState<ZarrGroup | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const group = await zarrClient.readGroup(name)
            if (canceled) return
            setGroup(group)
        }
        load()
        return () => {canceled = true}
    }, [expanded, name, zarrClient])
    const titlePanelColor = expanded ? '#336' : '#669'
    return (
        <div style={{marginLeft: 10}}>
            <div
                style={{cursor: 'pointer', paddingTop: 10, paddingBottom: 10, marginTop: 10, background: titlePanelColor, color: 'white', border: 'solid 1px black'}}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▼' : '►'} {name} <TitlePanelText name={name} group={group} zarrClient={zarrClient} />
            </div>
            {
                expanded && group && (
                    <ContentPanel name={name} group={group} zarrClient={zarrClient} />
                )
            }
        </div>
    )
}

type TitlePanelTextProps = {
    name: string
    group: ZarrGroup | undefined
    zarrClient: ZarrClient
}

const TitlePanelText: FunctionComponent<TitlePanelTextProps> = ({name, group, zarrClient}) => {
    if (!group) return <span>-</span>
    if (name === 'units') {
        return <UnitsTitlePanelText name={name} group={group} zarrClient={zarrClient} />
    }
    else {
        return <span>({group.objects.length})</span>
    }
}

const UnitsTitlePanelText: FunctionComponent<TitlePanelTextProps> = ({group, zarrClient}) => {
    const [numUnits, setNumUnits] = useState<number | undefined>(undefined)
    useEffect(() => {
        if (!group) return
        if (group.objects.filter(obj => obj.name === 'id').length === 0) return
        let canceled = false
        const load = async () => {
            const arrayClient = zarrClient.getArrayClient('units/id')
            const shape = await arrayClient.shape()
            if (canceled) return
            setNumUnits(shape[0])
        }
        load()
        return () => {canceled = true}
    }, [zarrClient, group])
    if (numUnits === undefined) return <span>...</span>
    return <span>({numUnits} units)</span>
}

type ContentPanelProps = {
    name: string
    group: ZarrGroup
    zarrClient: ZarrClient
}

const ContentPanel: FunctionComponent<ContentPanelProps> = ({name, group, zarrClient}) => {
    if (name === 'units') {
        return <UnitsContentPanel zarrClient={zarrClient} />
    }
    return (
        <div style={{marginLeft: 10}}>
            {
                group.objects.map((obj) => (
                    <div key={obj.name}>
                        {obj.name}
                    </div>
                ))
            }
        </div>
    )
}

function join(a: string, b: string) {
    if (!a) return b
    if (!b) return a
    if (a.endsWith('/')) {
        return a + b
    }
    else {
        return a + '/' + b
    }
}

export default NwbZarrView