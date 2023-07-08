import { FunctionComponent } from "react"
import AcquisitionItemTimeseriesView from "../NwbAcquisitionItemView/AcquisitionItemTimeseriesView"
import { useDataset, useGroup } from "../NwbMainView/NwbMainView"
import { RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"

type Props = {
    width: number
    height: number
    group: RemoteH5Group
    nwbFile: RemoteH5File
}

const NwbLFPView: FunctionComponent<Props> = ({width, height, group, nwbFile}) => {
    return (
        <AcquisitionItemTimeseriesView
            width={width}
            height={height}
            objectPath={`${group.path}/LFP`}
        />
    )
}

export default NwbLFPView