import { FunctionComponent } from "react"
import SleapView from "./SleapView/SleapView"

type Props = {
    width: number
    height: number
    filePath: string
}

const SleapFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    return (
        <SleapView
            width={width}
            height={height}
            filePath={filePath}
        />
    )
}

export default SleapFileView