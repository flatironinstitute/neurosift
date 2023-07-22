import { FunctionComponent, useEffect, useMemo, useReducer, useState } from "react"
import Hyperlink from "../../../components/Hyperlink"
import '../nwb-table.css'
import Abbreviate from "../viewPlugins/TimeSeries/TimeseriesItemView/Abbreviate"
import { useNwbOpenTabs } from "../NwbOpenTabsContext"
import { RemoteH5Dataset, RemoteH5File, RemoteH5Group } from "../RemoteH5File/RemoteH5File"
import { useSelectedItemViews } from "../SelectedItemViewsContext"
import { useGroup } from "./NwbMainView"
import { findViewPluginsForType } from "../viewPlugins/viewPlugins"
import ViewPluginButton from "../viewPlugins/ViewPluginButton"

type Props = {
    nwbFile: RemoteH5File
    groupPath: string
}

type LoadedGroups = {
    loaded: {[path: string]: RemoteH5Group}
    requestedPaths: string[]
}
type LoadedGroupsAction = {
    type: 'set'
    path: string
    group: RemoteH5Group
} | {
    type: 'request'
    path: string
}
const loadedGroupsReducer = (state: LoadedGroups, action: LoadedGroupsAction) => {
    if (action.type === 'set') {
        const loaded = {...state.loaded}
        loaded[action.path] = action.group
        return {
            loaded,
            requestedPaths: state.requestedPaths.filter(p => (p !== action.path))
        }
    }
    else if (action.type === 'request') {
        if (state.loaded[action.path]) return state
        if (state.requestedPaths.includes(action.path)) return state
        return {
            loaded: state.loaded,
            requestedPaths: [...state.requestedPaths, action.path]
        }
    }
    else return state
}

const ProcessingGroupContentPanel: FunctionComponent<Props> = ({nwbFile, groupPath}) => {
    const group = useGroup(nwbFile, groupPath)
    const [loadedGroups, dispatchLoadedGroups] = useReducer(loadedGroupsReducer, {loaded: {}, requestedPaths: []})
    const {selectedItemViews, toggleSelectedItemView} = useSelectedItemViews()
    useEffect(() => {
        const load = async () => {
            for (const p of loadedGroups.requestedPaths) {
                const g = await nwbFile.getGroup(p)
                dispatchLoadedGroups({type: 'set', path: p, group: g})
            }
        }
        load()
    }, [loadedGroups.requestedPaths, nwbFile])
    const tableItems = useMemo(() => {
        const ret: {name: string, path: string}[] = []
        if (group) {
            for (const subgroup of group.subgroups) {
                // Hard-code the containers (handle this in a better way in the future)
                // From Ben:
                // LFP holds ElectricalSeries
                // Fluorescence holds RoiResponseSeries
                // DFOverF holds RoiResponseSeries
                // BehavioralTimeSeries and BehavioralEvents hold TimeSeries
                // EyeTracking holds SpatialSeries
                // Position holds SpatialSeries
                if (['LFP', 'Fluorescence', 'DfOverF', 'BehavioralTimeSeries', 'EyeTracking', 'Position', 'PupilTracking', 'CompassDirection', 'BehavioralEvents'].includes(subgroup.attrs['neurodata_type'])) {
                    const gg = loadedGroups.loaded[subgroup.path]
                    if (gg) {
                        for (const subsubgroup of gg.subgroups) {
                            ret.push({
                                name: subgroup.name + '/' + subsubgroup.name,
                                path: subsubgroup.path
                            })
                        }
                    }
                    else {
                        dispatchLoadedGroups({type: 'request', path: subgroup.path})
                    }
                }
                else {
                    ret.push({
                        name: subgroup.name,
                        path: subgroup.path
                    })
                }
            }
        }
        return ret
    }, [group, loadedGroups.loaded])
    if (!group) return <div>...</div>
    return (
        <div>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th></th>
                        <th></th>
                        <th>Item</th>
                        <th>Neurodata type</th>
                        <th>Description</th>
                        <th>Comments</th>
                        <th>Data</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        tableItems.map((tableItem) => (
                            <GroupTableRow
                                key={tableItem.name}
                                name={tableItem.name}
                                nwbFile={nwbFile}
                                path={tableItem.path}
                                selected={!!selectedItemViews.find(a => a.startsWith(`neurodata-item:${tableItem.path}|`))}
                                onToggleSelect={(neurodataType) => toggleSelectedItemView(`neurodata-item:${tableItem.path}|${neurodataType}`)}
                            />
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

type GroupTableRowProps = {
    name: string,
    nwbFile: RemoteH5File
    path: string
    selected: boolean
    onToggleSelect: (neurodataType: string) => void
}

const GroupTableRow: FunctionComponent<GroupTableRowProps> = ({nwbFile, name, path, selected, onToggleSelect}) => {
    const group = useGroup(nwbFile, path)
    const [data, setData] = useState<RemoteH5Dataset | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            if (!group) return
            if (!group.datasets.find(ds => (ds.name === 'data'))) return
            const ds = await nwbFile.getDataset(path + '/data')
            if (canceled) return
            setData(ds)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, group, path])
    const {openTab} = useNwbOpenTabs()
    const neurodataType = group ? group.attrs['neurodata_type'] : ''
    const {viewPlugins, defaultViewPlugin} = useMemo(() => (findViewPluginsForType(neurodataType)), [neurodataType])
    return (
        <tr>
            <td>
                {
                    defaultViewPlugin && (
                        <input type="checkbox" checked={selected} disabled={!neurodataType} onClick={() => onToggleSelect(neurodataType)} onChange={() => {}} />
                    )
                }
            </td>
            <td>{
                <span>{
                    viewPlugins.filter(vp => (!vp.defaultForNeurodataType)).map(vp => (
                        <ViewPluginButton
                            key={vp.name}
                            viewPlugin={vp}
                            path={path}
                        />
                    ))
                }</span>
            }</td>
            <td>
                <Hyperlink disabled={!neurodataType} onClick={() => openTab(`neurodata-item:${path}|${neurodataType}`)}>{name}</Hyperlink>
            </td>
            <td>{group ? group.attrs['neurodata_type'] : ''}</td>
            <td>{group ? group.attrs['description'] : ''}</td>
            <td>{group ? <Abbreviate>{group.attrs['comments']}</Abbreviate> : ''}</td>
            <td>{data ? `${data.dtype} ${formatShape(data.shape)}` : ''}</td>
        </tr>
    )
}

const formatShape = (shape: number[]) => {
    return `[${shape.join(', ')}]`
}

export default ProcessingGroupContentPanel
