import { FunctionComponent } from "react"
import Hyperlink from "../../../components/Hyperlink"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { useSelectedItemViews } from "../SelectedItemViewsContext"
import { ViewPlugin } from "./viewPlugins"

type Props = {
    viewPlugin: ViewPlugin
    path: string
}

const ViewPluginButton: FunctionComponent<Props> = ({viewPlugin, path}) => {
    const {name, buttonLabel} = viewPlugin
    const {openTab} = useNwbOpenTabs()
    const {selectedItemViews, toggleSelectedItemView} = useSelectedItemViews()
    const handleClick = () => {
        console.log(`ViewPluginButton: ${name} ${path}`)
        openTab(`view:${viewPlugin.name}|${path}`)
    }
    return (
        <div style={{
            border: 'solid 1px lightgray',
            paddingLeft: 3,
            paddingRight: 8,
            paddingTop: 3,
            paddingBottom: 3
        }}>
            <input type="checkbox" checked={!!selectedItemViews.find(a => a.startsWith(`view:${viewPlugin.name}|${path}`))} onChange={() => {}} onClick={() => toggleSelectedItemView(`view:${viewPlugin.name}|${path}`)} />
            &nbsp;
            <Hyperlink
                onClick={handleClick}
            >
                {buttonLabel || name}
            </Hyperlink>
        </div>
    )
}

export default ViewPluginButton