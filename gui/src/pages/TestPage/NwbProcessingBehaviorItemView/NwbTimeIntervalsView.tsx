import { FunctionComponent } from "react"
import { useDatasetData } from "../NwbMainView"
import { RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import NwbTimeIntervalsWidget from "./NwbTimeIntervalsWidget"

type Props = {
    width: number
    height: number
    group: RemoteH5Group
    nwbFile: RemoteH5File
}

const NwbTimeIntervalsView: FunctionComponent<Props> = ({width, height, group, nwbFile}) => {
    const {data: labelData} = useDatasetData(nwbFile, `${group.path}/label`)
    const {data: startTimeData} = useDatasetData(nwbFile, `${group.path}/start_time`)
    const {data: stopTimeData} = useDatasetData(nwbFile, `${group.path}/stop_time`)

    if ((!labelData) || (!startTimeData) || (!stopTimeData)) {
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