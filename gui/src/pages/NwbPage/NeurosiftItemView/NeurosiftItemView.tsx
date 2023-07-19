import { FunctionComponent } from "react"
import FileView from '../../BrowsePage/FileView/FileView'

type Props = {
    width: number
    height: number
    url: string
}

const NeurosiftItemView: FunctionComponent<Props> = ({ width, height, url }) => {
    return (
        <FileView
            width={width}
            height={height}
            filePath={url}
        />
    )
}

export default NeurosiftItemView