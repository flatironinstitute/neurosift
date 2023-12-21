import { FunctionComponent, PropsWithChildren } from "react"
import TimeseriesSelectionWidget from "../viewPlugins/TimeSeries/TimeseriesItemView/TimeseriesSelectionWidget"
import { RemoteH5Group } from "@fi-sci/remote-h5-file"
import ShareTabComponent from "./ShareTabComponent"
import { ViewPlugin } from "../viewPlugins/viewPlugins"
import LoadInPythonComponent from "./LoadInPythonComponent"

type Props = {
    width: number
    height: number
    path: string
    additionalPaths?: string[]
    group: RemoteH5Group | undefined
    viewName: string
    tabName?: string
    viewPlugin: ViewPlugin
}

const NeurodataItemViewLeftPanel: FunctionComponent<Props> = ({width, height, path, additionalPaths, group, viewName, tabName, viewPlugin}) => {
    return (
        <div>
            <table className="nwb-table">
                <tbody>
                    <tr>
                        <td>Item path</td>
                        <td>{path}</td>
                    </tr>
                    <tr>
                        <td>Neurodata type</td>
                        <td>{group?.attrs?.neurodata_type}</td>
                    </tr>
                    <tr>
                        <td>Description</td>
                        <td>{group?.attrs?.description}</td>
                    </tr>
                    <tr>
                        <td>Comments</td>
                        <td><Abbreviate>{group?.attrs?.comments}</Abbreviate></td>
                    </tr>
                    <tr>
                        <td>View</td>
                        <td>{viewName}</td>
                    </tr>
                </tbody>
            </table>
            {
                viewPlugin.isTimeView && <TimeseriesSelectionWidget />
            }
            <hr />
            <ShareTabComponent tabName={tabName} />
            <hr />
            {group && <LoadInPythonComponent path={path} group={group} viewName={viewName} />}
        </div>
    )
}

export const Abbreviate: FunctionComponent<PropsWithChildren> = ({children}) => {
    return (
        <span>{abbreviateText(children as string)}</span>
    )
}

const abbreviateText = (text: string | undefined) => {
    if (text === undefined) return ''
    const maxLen = 300
    if (text.length <= maxLen) return text
    const abbrev = text.slice(0, maxLen) + '...'
    return abbrev
}

export default NeurodataItemViewLeftPanel