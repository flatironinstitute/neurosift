import { FunctionComponent, useContext } from "react"
import Splitter from "../../../../components/Splitter"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"
import NeurodataItemViewLeftPanel from "../../NeurodataItemView/NeurodataItemViewLeftPanel"
import HelloWorldWidget from "./HelloWorldWidget"

// This is an example Neurosift view plugin.
// See ../viewPlugins.ts for how it is registered.

// Every view plugin has the following interface:
type Props = {
    width: number
    height: number
    path: string // path within the nwb file to the group of the item to be viewed
    condensed?: boolean
}

const HelloWorldView: FunctionComponent<Props> = ({width, height, path, condensed}) => {
    // Access the global nwb file
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')

    // Get the group of the item to be viewed
    const group = useGroup(nwbFile, path)

    // See ./HelloWorldWidget.tsx for the implementation of the widget
    const content = (
        <HelloWorldWidget
            width={width}
            height={height}
            path={path}
        />
    )


    // If we are in condensed mode, just return the content
    if (condensed) return content

    // Otherwise return a splitter with a left panel and the content
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
                viewName="SpatialSeries"
            />
            {content}
        </Splitter>
    )
}

export default HelloWorldView