import { FunctionComponent, useContext, useMemo } from "react"
import Splitter from "../../../components/Splitter"
import TimeseriesSelectionWidget from "../TimeseriesItemView/TimeseriesSelectionWidget"
import { NwbFileContext } from "../NwbFileContext"
import NeurodataItemView from "./NeurodataItemView"

type Props = {
    width: number
    height: number
    items: {
        path: string
        neurodataType: string
    }[]
}

const NeurodataItemsView: FunctionComponent<Props> = ({width, height, items}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    const itemNames = useMemo(() => {
        return items.map(item => item.path)
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
            />
            <MainPanel
                width={0}
                height={0}
                items={items}
            />
        </Splitter>
    )
}

type LeftPanelProps = {
    width: number
    height: number
    itemNames: string[]
}

const LeftPanel: FunctionComponent<LeftPanelProps> = ({width, height, itemNames}) => {
    return (
        <div>
            <TimeseriesSelectionWidget />
        </div>
    )
}

type MainPanelProps = {
    width: number
    height: number
    items: {
        path: string
        neurodataType: string
    }[]
}

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, items}) => {
    const H = height / items.length
    const positions = items.map((_, i) => i * H)
    const titleBarHeight = 25
    // a nice attractive title bar color
    const titleBarColor = '#68e'
    return (
        <div style={{position: 'absolute', width, height}}>
            {
                items.map((item, i) => (
                    <div key={item.path} style={{position: 'absolute', width, height: H, top: positions[i]}}>
                        <div style={{position: 'absolute', width, height: titleBarHeight - 5, backgroundColor: titleBarColor, color: 'white', fontSize: 12, paddingLeft: 10, paddingTop: 5}}>
                            {item.path}
                        </div>
                        <div style={{position: 'absolute', width, height: H - titleBarHeight, top: titleBarHeight}}>
                            <NeurodataItemView
                                width={width}
                                height={H - titleBarHeight}
                                path={item.path}
                                neurodataType={item.neurodataType}
                                condensed={true}
                            />
                        </div>
                    </div>
                ))
            }
        </div>
    )
}

export default NeurodataItemsView