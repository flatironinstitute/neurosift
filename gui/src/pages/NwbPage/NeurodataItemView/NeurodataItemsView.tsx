import { FunctionComponent, useContext, useMemo } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { MergedRemoteH5File, RemoteH5File } from "../RemoteH5File/RemoteH5File"
import TimeseriesSelectionWidget from "../viewPlugins/TimeSeries/TimeseriesItemView/TimeseriesSelectionWidget"
import viewPlugins, { findViewPluginsForType } from "../viewPlugins/viewPlugins"
import ShareTabComponent from "./ShareTabComponent"

type Props = {
    width: number
    height: number
    items: string[]
    tabName?: string
}

const NeurodataItemsView: FunctionComponent<Props> = ({width, height, items, tabName}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    const itemNames = useMemo(() => {
        return items.map(item => getNameForItemView(item))
    }, [items])

    return (
        <Splitter
            direction="horizontal"
            initialPosition={300}
            width={width}
            height={height}
        >
            <LeftPanel
                width={0}
                height={0}
                itemNames={itemNames}
                tabName={tabName}
            />
            <MainPanel
                width={0}
                height={0}
                items={items}
            />
        </Splitter>
    )
}

const getNameForItemView = (item: string) => {
    if (item.startsWith('neurodata-item:')) {
        const itemPath = item.slice(`neurodata-item:`.length).split('|')[0]
        const neurodataType = item.slice(`neurodata-item:`.length).split('|')[1]
        return `${itemPath} (${neurodataType})`
    }
    else if (item.startsWith('view:')) {
        const pName = item.slice(`view:`.length).split('|')[0]
        const itemPath = item.slice(`view:`.length).split('|')[1]
        return `${itemPath} (${pName})`
    }
    else return item
}

type LeftPanelProps = {
    width: number
    height: number
    itemNames: string[]
    tabName?: string
}

const LeftPanel: FunctionComponent<LeftPanelProps> = ({width, height, itemNames, tabName}) => {
    return (
        <div>
            <TimeseriesSelectionWidget />
            <hr />
            <ShareTabComponent
                tabName={tabName}
            />
        </div>
    )
}

type MainPanelProps = {
    width: number
    height: number
    items: string[]
}

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, items}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const H = height / items.length
    const positions = items.map((_, i) => i * H)
    const titleBarHeight = 25
    // a nice attractive title bar color
    const titleBarColor = '#68e'
    return (
        <div style={{position: 'absolute', width, height}}>
            {
                items.map((item, i) => {
                    const {viewPlugin, itemPath} = getViewPluginAndItemPath(item, nwbFile)
                    if (!viewPlugin) return (
                        <div>View plugin not found: {item}</div>
                    )
                    return (
                        <div key={item} style={{position: 'absolute', width, height: H, top: positions[i]}}>
                            <div style={{position: 'absolute', width, height: titleBarHeight - 5, backgroundColor: titleBarColor, color: 'white', fontSize: 12, paddingLeft: 10, paddingTop: 5}}>
                                {getNameForItemView(item)}
                            </div>
                            <div style={{position: 'absolute', width, height: H - titleBarHeight, top: titleBarHeight}}>
                                {
                                    <viewPlugin.component
                                        width={width}
                                        height={H - titleBarHeight}
                                        path={itemPath}
                                        condensed={true}
                                    />
                                }
                            </div>
                        </div>
                    )
                })
            }
        </div>
    )
}

const getViewPluginAndItemPath = (item: string, nwbFile: RemoteH5File | MergedRemoteH5File) => {
    if (item.startsWith('neurodata-item:')) {
        const itemPath = item.slice(`neurodata-item:`.length).split('|')[0]
        const neurodataType = item.slice(`neurodata-item:`.length).split('|')[1]
        const {defaultViewPlugin} = findViewPluginsForType(neurodataType, {nwbFile})
        return {viewPlugin: defaultViewPlugin, itemPath}
    }
    else if (item.startsWith('view:')) {
        const pName = item.slice(`view:`.length).split('|')[0]
        const itemPath = item.slice(`view:`.length).split('|')[1]
        const viewPlugin = viewPlugins.find(p => (p.name === pName))
        return {viewPlugin, itemPath}
    }
    else return {viewPlugin: undefined, itemPath: undefined}
}

export default NeurodataItemsView