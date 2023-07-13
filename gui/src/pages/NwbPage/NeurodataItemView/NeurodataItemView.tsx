import { FunctionComponent } from "react"
import { neurodataTypeParentType } from "../neurodataSpec"
import viewPlugins from "./viewPlugins"

type Props = {
    width: number
    height: number
    path: string
    neurodataType: string
    condensed?: boolean
}

const NeurodataItemView: FunctionComponent<Props> = ({width, height, path, neurodataType, condensed}) => {
    let nt: string | undefined = neurodataType
    while (nt) {
        const viewPlugin = viewPlugins.find(a => (a.neurodataType === nt))
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
        nt = neurodataTypeParentType(nt)
    }
    
    return <div>Unsupported neurodata type: {neurodataType}</div>
}

export default NeurodataItemView