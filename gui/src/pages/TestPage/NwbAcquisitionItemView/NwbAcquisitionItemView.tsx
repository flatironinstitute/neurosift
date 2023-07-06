import { FunctionComponent, useContext, useEffect, useState } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import AcquisitionItemTimeseriesView from "./AcquisitionItemTimeseriesView"
import TimeseriesSelectionWidget from "./TimeseriesSelectionWidget"

type Props = {
    width: number
    height: number
    itemName: string
}

const NwbAcquisitionItemView: FunctionComponent<Props> = ({width, height, itemName}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const [group, setGroup] = useState<RemoteH5Group | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const grp = await nwbFile.getGroup(`acquisition/${itemName}`)
            if (canceled) return
            setGroup(grp)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, itemName])

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
            <AcquisitionItemTimeseriesView
                width={0}
                height={0}
                itemName={itemName}
            />
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
                        <td>{group?.attrs?.comments}</td>
                    </tr>
                </tbody>
            </table>
            <TimeseriesSelectionWidget />
        </div>
    )
}

export default NwbAcquisitionItemView