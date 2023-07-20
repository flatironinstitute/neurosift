import { FunctionComponent, useContext } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { useGroup } from "../NwbMainView/NwbMainView"
import { findViewPluginsForType, ViewPlugin } from "../viewPlugins/viewPlugins"
import NeurodataItemViewLeftPanel from "./NeurodataItemViewLeftPanel"

type Props = {
    width: number
    height: number
    viewPlugin: ViewPlugin
    itemPath: string
    condensed?: boolean
}

const ViewItemWidget: FunctionComponent<Props> = ({width, height, viewPlugin, itemPath, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, itemPath)

    const content = (
        <viewPlugin.component
            width={width}
            height={height}
            path={itemPath}
            condensed={condensed}
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
                path={itemPath}
                group={group}
                viewName={viewPlugin.name}
            />
            {content}
        </Splitter>
    )
}

export default ViewItemWidget