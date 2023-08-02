import { FunctionComponent, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { defaultUnitSelection, sortIds, UnitSelectionContext, unitSelectionReducer } from "../../../../package/context-unit-selection"
import { useSelectedUnitIds } from "../../../../package/context-unit-selection/UnitSelectionContext"
import IfHasBeenVisible from "../../../BrowsePage/FileView/SpikeSortingDigestView/IfHasBeenVisible"
import { NwbFileContext } from "../../NwbFileContext"
import { useGroup } from "../../NwbMainView/NwbMainView"
import { DirectSpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView"
import PSTHUnitWidget from "./PSTHUnitWidget"

type Props = {
    width: number
    height: number
    path: string
    condensed?: boolean
}

const PSTHItemView: FunctionComponent<Props> = ({width, height, path}) => {
    const [unitSelection, unitSelectionDispatch] = useReducer(unitSelectionReducer, defaultUnitSelection)
    return (
        <UnitSelectionContext.Provider value={{unitSelection, unitSelectionDispatch}}>
            <PSTHItemViewChild width={width} height={height} path={path} />
        </UnitSelectionContext.Provider>
    )
}

export type PSTHPrefs = {
    showRaster: boolean
    showHist: boolean
    height: 'small' | 'medium' | 'large'
}

export const defaultPSTHPrefs: PSTHPrefs = {
    showRaster: true,
    showHist: true,
    height: 'medium'
}

const PSTHItemViewChild: FunctionComponent<Props> = ({width, height, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: no nwbFile')

    const {selectedUnitIds: selectedUnitIdsSet, unitIdSelectionDispatch} = useSelectedUnitIds()
    const setSelectedUnitIds = useCallback((selectedUnitIds: (number | string)[]) => {
        unitIdSelectionDispatch({type: 'SET_SELECTION', incomingSelectedUnitIds: selectedUnitIds})
    }, [unitIdSelectionDispatch])
    const selectedUnitIds = useMemo(() => {
        return sortIds([...selectedUnitIdsSet])
    }, [selectedUnitIdsSet])

    const [spikeTrainsClient, setSpikeTrainsClient] = useState<DirectSpikeTrainsClient | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const client = new DirectSpikeTrainsClient(nwbFile, '/units')
            await client.initialize()
            if (canceled) return
            setSpikeTrainsClient(client)
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path])

    const unitIds = useMemo(() => {
        if (!spikeTrainsClient) return []
        return spikeTrainsClient.unitIds
    }, [spikeTrainsClient])

    const [alignToVariables, setAlignToVariables] = useState<string[]>(['start_time'])
    const [groupByVariable, setGroupByVariable] = useState<string>('')
    const [windowRangeStr, setWindowRangeStr] = useState<{start: string, end: string}>({start: '-0.5', end: '1'})
    const windowRange = useMemo(() => {
        const t1 = parseFloat(windowRangeStr.start)
        const t2 = parseFloat(windowRangeStr.end)
        if (isNaN(t1) || isNaN(t2)) return {start: 0, end: 1}
        if (t1 >= t2) return {start: 0, end: 1}
        if (t2 - t1 > 10) return {start: 0, end: 1}
        return {
            start: t1,
            end: t2
        }
    }, [windowRangeStr])

    const [prefs, setPrefs] = useState<PSTHPrefs>(defaultPSTHPrefs)

    const unitsTable = <UnitSelectionComponent unitIds={unitIds} selectedUnitIds={selectedUnitIds} setSelectedUnitIds={setSelectedUnitIds} />

    const alignToSelectionComponent = (
        <AlignToSelectionComponent alignToVariables={alignToVariables} setAlignToVariables={setAlignToVariables} path={path} />
    )

    const groupBySelectionComponent = (
        <GroupBySelectionComponent groupByVariable={groupByVariable} setGroupByVariable={setGroupByVariable} path={path} />
    )

    const windowRangeSelectionComponent = (
        <WindowRangeSelectionComponent windowRangeStr={windowRangeStr} setWindowRangeStr={setWindowRangeStr} />
    )

    const prefsComponent = (
        <PrefsComponent prefs={prefs} setPrefs={setPrefs} />
    )

    const unitsTableWidth = 200
    const unitsTableHeight = height / 2
    const groupByHeight = 50
    const windowRangeHeight = 50
    const prefsHeight = 70
    const alignToSelectionComponentHeight = height - unitsTableHeight - groupByHeight - windowRangeHeight - prefsHeight

    const unitWidgetHeight = Math.min(height, prefs.height === 'small' ? 300 : (prefs.height === 'medium' ? 600 : 900))

    // const initialized = useRef<boolean>(false)
    // useEffect(() => {
    //     initialized.current = false
    // }, [path, unitIds])
    // useEffect(() => {
    //     if (initialized.current) return
    //     if (unitIds.length === 0) return
    //     if (selectedUnitIds.length > 0) return
    //     setSelectedUnitIds([unitIds[0]])
    //     initialized.current = true
    // }, [unitIds, selectedUnitIds, setSelectedUnitIds])

    return (
        <div style={{position: 'absolute', width, height}}>
            <div style={{position: 'absolute', width: unitsTableWidth, height: unitsTableHeight - 20, overflowY: 'auto'}}>
                {unitsTable}
            </div>
            <div style={{position: 'absolute', width: unitsTableWidth, top: unitsTableHeight, height: alignToSelectionComponentHeight, overflowY: 'auto'}}>
                {alignToSelectionComponent}
            </div>
            <div style={{position: 'absolute', width: unitsTableWidth, top: unitsTableHeight + alignToSelectionComponentHeight, height: windowRangeHeight, overflowY: 'hidden'}}>
                {windowRangeSelectionComponent}
            </div>
            <div style={{position: 'absolute', width: unitsTableWidth, height: groupByHeight, top: unitsTableHeight + alignToSelectionComponentHeight + windowRangeHeight, overflowY: 'hidden'}}>
                {groupBySelectionComponent}
            </div>
            <div style={{position: 'absolute', width: unitsTableWidth, height: prefsHeight, top: unitsTableHeight + alignToSelectionComponentHeight + windowRangeHeight + groupByHeight, overflowY: 'hidden'}}>
                {prefsComponent}
            </div>
            <div style={{position: 'absolute', left: unitsTableWidth, width: width - unitsTableWidth, height, overflowY: 'auto'}}>
                {
                    spikeTrainsClient && selectedUnitIds.map((unitId, i) => (
                        <div key={unitId} style={{position: 'absolute', top: i * unitWidgetHeight, width: width - unitsTableWidth, height: unitWidgetHeight}}>
                            <IfHasBeenVisible
                                width={width - unitsTableWidth}
                                height={unitWidgetHeight}
                            >
                                <PSTHUnitWidget
                                    width={width - unitsTableWidth}
                                    height={unitWidgetHeight}
                                    path={path}
                                    spikeTrainsClient={spikeTrainsClient}
                                    unitId={unitId}
                                    alignToVariables={alignToVariables}
                                    groupByVariable={groupByVariable}
                                    windowRange={windowRange}
                                    prefs={prefs}
                                />
                            </IfHasBeenVisible>
                        </div>
                    ))
                }
                {
                    selectedUnitIds.length === 0 && (
                        <div>Select one or more units</div>
                    )
                }
            </div>
        </div>
    )
}

const AlignToSelectionComponent: FunctionComponent<{alignToVariables: string[], setAlignToVariables: (x: string[]) => void, path: string}> = ({alignToVariables, setAlignToVariables, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: no nwbFile')

    const group = useGroup(nwbFile, path)
    const options = (group?.datasets || []).map(ds => ds.name).filter(name => (name.endsWith('_time') || name.endsWith('_times')))

    return (
        <table className="nwb-table">
            <thead>
                <tr>
                    <th></th>
                    <th>Align to</th>
                </tr>
            </thead>
            <tbody>
                {
                    options.map((option) => (
                        <tr key={option}>
                            <td>
                                <input type="checkbox" checked={alignToVariables.includes(option)} onChange={() => {}} onClick={() => {
                                    if (alignToVariables.includes(option)) {
                                        setAlignToVariables(alignToVariables.filter(x => (x !== option)))
                                    }
                                    else {
                                        setAlignToVariables([...alignToVariables, option])
                                    }
                                }} />
                            </td>
                            <td>{option}</td>
                        </tr>
                    ))
                }
            </tbody>
        </table>
    )
}

const UnitSelectionComponent: FunctionComponent<{unitIds: (number | string)[], selectedUnitIds: (number | string)[], setSelectedUnitIds: (x: (number | string)[]) => void}> = ({unitIds, selectedUnitIds, setSelectedUnitIds}) => {
    return (
        <table className="nwb-table">
            <thead>
                <tr>
                    <th>
                        <input type="checkbox" checked={unitIds.length > 0 && (selectedUnitIds.length === unitIds.length)} onChange={() => {}} onClick={() => {
                            if (selectedUnitIds.length > 0) {
                                setSelectedUnitIds([])
                            }
                            else {
                                setSelectedUnitIds(unitIds)
                            }
                        }} />
                    </th>
                    <th>Unit ID</th>
                </tr>
            </thead>
            <tbody>
                {
                    unitIds.map((unitId) => (
                        <tr key={unitId}>
                            <td>
                                <input type="checkbox" checked={selectedUnitIds.includes(unitId)} onChange={() => {}} onClick={() => {
                                    if (selectedUnitIds.includes(unitId)) {
                                        setSelectedUnitIds(selectedUnitIds.filter(x => (x !== unitId)))
                                    }
                                    else {
                                        setSelectedUnitIds([...selectedUnitIds, unitId])
                                    }
                                }} />
                            </td>
                            <td>{unitId}</td>
                        </tr>
                    ))
                }
            </tbody>
        </table>
    )
}

const GroupBySelectionComponent: FunctionComponent<{groupByVariable: string, setGroupByVariable: (x: string) => void, path: string}> = ({groupByVariable, setGroupByVariable, path}) => {
    const nwbFile = useContext(NwbFileContext)
    if (!nwbFile) throw Error('Unexpected: no nwbFile')

    const group = useGroup(nwbFile, path)
    const options = (group?.datasets || []).map(ds => ds.name).filter(name => (!name.endsWith('_time') && !name.endsWith('_times')))
    return (
        <div>
            Group by:<br />
            <select
                value={groupByVariable}
                onChange={(evt) => {
                    setGroupByVariable(evt.target.value)
                }}
            >
                <option value="">(none)</option>
                {
                    options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))
                }
            </select>
        </div>
    )
}

const WindowRangeSelectionComponent: FunctionComponent<{windowRangeStr: {start: string, end: string}, setWindowRangeStr: (x: {start: string, end: string}) => void}> = ({windowRangeStr: windowRange, setWindowRangeStr: setWindowRange}) => {
    return (
        <div>
            Window range (sec):<br />
            <input style={{width: 50}} type="text" value={windowRange.start} onChange={(evt) => {setWindowRange({start: evt.target.value, end: windowRange.end})}} />
            &nbsp;to&nbsp;
            <input style={{width: 50}} type="text" value={windowRange.end} onChange={(evt) => {setWindowRange({start: windowRange.start, end: evt.target.value})}} />
        </div>
    )
}

const PrefsComponent: FunctionComponent<{prefs: PSTHPrefs, setPrefs: (x: PSTHPrefs) => void}> = ({prefs, setPrefs}) => {
    return (
        <div>
            <input type="checkbox" checked={prefs.showRaster} onChange={() => {}} onClick={() => {setPrefs({...prefs, showRaster: !prefs.showRaster})}} /> Show raster
            <br />
            <input type="checkbox" checked={prefs.showHist} onChange={() => {}} onClick={() => {setPrefs({...prefs, showHist: !prefs.showHist})}} /> Show histogram
            <br />
            Height:&nbsp;
            <select
                value={prefs.height}
                onChange={(evt) => {
                    setPrefs({...prefs, height: evt.target.value as any})
                }}
            >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
            </select>
        </div>
    )
}

export default PSTHItemView