import { FunctionComponent, useContext } from "react";
import { NwbFileContext } from "../NwbFileContext";
import NwbTimeseriesView from "./NwbTimeseriesView";

type Props = {
    width: number
    height: number
    objectPath: string
}

const AcquisitionItemTimeseriesView: FunctionComponent<Props> = ({ width, height, objectPath }) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    return (
        <NwbTimeseriesView
            width={width}
            height={height}
            objectPath={objectPath}
        />
    )
}

export default AcquisitionItemTimeseriesView