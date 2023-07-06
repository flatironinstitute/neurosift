import { FunctionComponent, useContext, useEffect, useState } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import AcquisitionItemTimeseriesView from "../NwbAcquisitionItemView/AcquisitionItemTimeseriesView"
import TimeseriesSelectionWidget from "../NwbAcquisitionItemView/TimeseriesSelectionWidget"

type Props = {
    width: number
    height: number
    itemNames: string[]
}

const NwbAcquisitionItemsView: FunctionComponent<Props> = ({width, height, itemNames}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const grp = await nwbFile.getGroup(`acquisition/${itemNames[0]}`)
            if (canceled) return
            setGroup(grp)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, itemNames])

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
                group={group}
            />
            <MainPanel
                width={0}
                height={0}
                itemNames={itemNames}
            />
        </Splitter>
    )
}

type LeftPanelProps = {
    width: number
    height: number
    itemNames: string[]
    group: RemoteH5Group | undefined
}

const LeftPanel: FunctionComponent<LeftPanelProps> = ({width, height, itemNames, group}) => {
    return (
        <div>
            <TimeseriesSelectionWidget />
        </div>
    )
}

type MainPanelProps = {
    width: number
    height: number
    itemNames: string[]
}

const MainPanel: FunctionComponent<MainPanelProps> = ({width, height, itemNames}) => {
    const H = height / itemNames.length
    const positions = itemNames.map((_, i) => i * H)
    const titleBarHeight = 25
    // a nice attractive title bar color
    const titleBarColor = '#68e'
    return (
        <div style={{position: 'absolute', width, height}}>
            {
                itemNames.map((itemName, i) => (
                    <div key={itemName} style={{position: 'absolute', width, height: H, top: positions[i]}}>
                        <div style={{position: 'absolute', width, height: titleBarHeight, backgroundColor: titleBarColor, color: 'white', fontSize: 12, paddingLeft: 10, paddingTop: 5}}>
                            {itemName}
                        </div>
                        <div style={{position: 'absolute', width, height: H - titleBarHeight, top: titleBarHeight, backgroundColor: 'black'}}>
                            <AcquisitionItemTimeseriesView
                                width={width}
                                height={H - titleBarHeight}
                                itemName={itemName}
                            />
                        </div>
                    </div>
                ))
            }
        </div>
    )
}

export default NwbAcquisitionItemsView