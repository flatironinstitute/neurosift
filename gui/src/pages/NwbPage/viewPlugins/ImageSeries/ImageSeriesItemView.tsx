import { FunctionComponent, useContext } from "react"
import Splitter from "../../../../components/Splitter"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"
import NeurodataItemViewLeftPanel from "../../NeurodataItemView/NeurodataItemViewLeftPanel"
import ImageSeriesItemWidget from "./ImageSeriesItemWidget"

type Props = {
    width: number
    height: number
    path: string // path within the nwb file to the group of the item to be viewed
    condensed?: boolean
}

const ImageSeriesItemView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    const group = useGroup(nwbFile, path)

    const content = (
        <ImageSeriesItemWidget
            width={width}
            height={height}
            path={path}
        />
    )


    if (condensed) return content

    return (
        <Splitter
            direction="horizontal"
            initialPosition={300}
            width={width}
            height={height}
        >
            <NeurodataItemViewLeftPanel
                width={0}
                height={0}
                path={path}
                group={group}
                viewName="HelloWorld"
            />
            {content}
        </Splitter>
    )
}

export default ImageSeriesItemView