import { FunctionComponent } from "react"
import PynappleSessionWidget from "./PynappleSessionWidget/PynappleSessionWidget"

type Props = {
    width: number
    height: number
    filePath: string
}

const PynappleSessionFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    return (
        <PynappleSessionWidget
            width={width}
            height={height}
            sessionPath={filePath}
        />
    )
}

export default PynappleSessionFileView