import { FunctionComponent } from "react"
import NwbZarrView from "./NwbZarrView/NwbZarrView"

type Props = {
    width: number
    height: number
    filePath: string
}

const NwbZarrFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    return (
        <NwbZarrView
            width={width}
            height={height}
            path={filePath}
        />
    )
}

export default NwbZarrFileView