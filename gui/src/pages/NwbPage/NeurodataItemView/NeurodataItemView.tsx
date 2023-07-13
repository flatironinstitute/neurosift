import { FunctionComponent } from "react"
import { findViewPluginForType } from "./viewPlugins"

type Props = {
    width: number
    height: number
    path: string
    neurodataType: string
    condensed?: boolean
}

const NeurodataItemView: FunctionComponent<Props> = ({width, height, path, neurodataType, condensed}) => {
    const viewPlugin = findViewPluginForType(neurodataType)
    if (viewPlugin) {
        return (
            <viewPlugin.component
                width={width}
                height={height}
                path={path}
                condensed={condensed}
            />
        )
    }
    return <div>Unsupported neurodata type: {neurodataType}</div>
}

export default NeurodataItemView