import { FunctionComponent, useContext } from "react"
import Splitter from "../../../components/Splitter"
import { NwbFileContext } from "../NwbFileContext"
import { useGroup } from "../NwbMainView/NwbMainView"
import { findViewPluginForType } from "../viewPlugins/viewPlugins"
import NeurodataItemViewLeftPanel from "./NeurodataItemViewLeftPanel"

type Props = {
    width: number
    height: number
    path: string
    neurodataType: string
    condensed?: boolean
}

const NeurodataItemView: FunctionComponent<Props> = ({width, height, path, neurodataType, condensed}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: nwbFile is undefined (no context provider)')
    const group = useGroup(nwbFile, path)

    const viewPlugin = findViewPluginForType(neurodataType)
    if (!viewPlugin) {
        return <div>Unsupported neurodata type: {neurodataType}</div>
    }

    const content = (
        <viewPlugin.component
            width={width}
            height={height}
            path={path}
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
                path={path}
                group={group}
                viewName={viewPlugin.name}
            />
            {content}
        </Splitter>
    )
}

export default NeurodataItemView