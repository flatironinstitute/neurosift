import { Hyperlink } from "@fi-sci/misc"
import { FunctionComponent, useEffect, useState } from "react"
import { useNwbFile } from "../NwbFileContext"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { useSelectedItemViews } from "../SelectedItemViewsContext"
import { ViewPlugin } from "./viewPlugins"

type Props = {
    viewPlugin: ViewPlugin
    path: string
}

const ViewPluginButton: FunctionComponent<Props> = ({viewPlugin, path}) => {
    const nwbFile = useNwbFile()
    if (!nwbFile) throw Error('Unexpected: no nwbFile')
    const {name, buttonLabel} = viewPlugin
    const {openTab} = useNwbOpenTabs()
    const {selectedItemViews, toggleSelectedItemView} = useSelectedItemViews()
    const handleClick = () => {
        console.log(`ViewPluginButton: ${name} ${path}`)
        openTab(`view:${viewPlugin.name}|${path}`)
    }
    const [enabled, setEnabled] = useState<boolean>(false)
    useEffect(() => {
        if (!viewPlugin.checkEnabled) {
            setEnabled(true)
            return
        }
        let canceled = false
        setEnabled(false)
        viewPlugin.checkEnabled(nwbFile, path).then((enabled) => {
            if (canceled) return
            setEnabled(enabled)
        })
        return () => {canceled = true}
    }, [viewPlugin, path, nwbFile])

    if (!enabled) return <span />

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
                color={viewPlugin.usesPairio ? 'darkgreen' : undefined}
            >
                {buttonLabel || name}{viewPlugin.usesPairio ? '*' : ''}
            </Hyperlink>
        </div>
    )
}

export default ViewPluginButton