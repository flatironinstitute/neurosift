import { FunctionComponent, useContext } from "react"
import { NwbFileContext } from "../../NwbFileContext"
import { useDatasetData } from "../../NwbMainView/NwbMainView"
import { RemoteH5File, RemoteH5Group } from "../../RemoteH5File/RemoteH5File"
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget"

type Props = {
    width: number
    height: number
    path: string
}

const NwbTimeIntervalsView: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is null')
    const {data: labelData} = useDatasetData(nwbFile, `${path}/label`)
    const {data: startTimeData} = useDatasetData(nwbFile, `${path}/start_time`)
    const {data: stopTimeData} = useDatasetData(nwbFile, `${path}/stop_time`)

    if ((!startTimeData) || (!stopTimeData)) {
        return <div>loading data...</div>
    }

    return (
        <NwbTimeIntervalsWidget
            labels={labelData}
            startTimes={startTimeData}
            stopTimes={stopTimeData}
            width={width}
            height={height}
        />
    )
}

export default NwbTimeIntervalsView