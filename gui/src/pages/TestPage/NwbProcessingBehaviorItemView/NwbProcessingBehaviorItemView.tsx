import { FunctionComponent, useContext } from "react"
import Splitter from "../../../components/Splitter"
import { Abbreviate } from "../NwbAcquisitionItemView/NwbAcquisitionItemView"
import TimeseriesSelectionWidget from "../NwbAcquisitionItemView/TimeseriesSelectionWidget"
import { NwbFileContext } from "../NwbFileContext"
import { useGroup } from "../NwbMainView"
import { RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import NwbTimeIntervalsView from "./NwbTimeIntervalsView"

type Props = {
    width: number
    height: number
    itemName: string
}

const NwbProcessingBehaviorItemView: FunctionComponent<Props> = ({width, height, itemName}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, `/processing/behavior/${itemName}`)
    
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
                itemName={itemName}
                group={group}
            />
            {
                group ? (
                    <NwbTimeIntervalsView
                        width={0}
                        height={0}
                        nwbFile={nwbFile}
                        group={group}
                    />
                ) : (
                    <div>loading group...</div>
                )
            }
        </Splitter>
    )
}

type LeftPanelProps = {
    width: number
    height: number
    itemName: string
    group: RemoteH5Group | undefined
}

const LeftPanel: FunctionComponent<LeftPanelProps> = ({width, height, itemName, group}) => {
    return (
        <div>
            <table className="nwb-table">
                <tbody>
                    <tr>
                        <td>Item name</td>
                        <td>{itemName}</td>
                    </tr>
                    <tr>
                        <td>Neurodata type</td>
                        <td>{group?.attrs?.neurodata_type}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>{group?.attrs?.description}</td>
                    </tr>
                    <tr>
                        <td>Comments</td>
                        <td><Abbreviate>{group?.attrs?.comments}</Abbreviate></td>
                    </tr>
                </tbody>
            </table>
            <TimeseriesSelectionWidget />
        </div>
    )
}

export default NwbProcessingBehaviorItemView