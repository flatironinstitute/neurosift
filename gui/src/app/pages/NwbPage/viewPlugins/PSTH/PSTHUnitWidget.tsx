/* eslint-disable @typescript-eslint/no-explicit-any */
import { FunctionComponent, useEffect, useMemo, useState } from "react"
import { useNwbFile } from "../../NwbFileContext"
import { DirectSpikeTrainsClient } from "../Units/DirectRasterPlotUnitsItemView"
import PSTHHistWidget from "./PSTHHistWidget"
import { PSTHPrefs } from "./PSTHItemView"
import PSTHRasterWidget from "./PSTHRasterWidget"

type Props = {
    width: number
    height: number
    path: string
    spikeTrainsClient: DirectSpikeTrainsClient
    unitId: string | number
    alignToVariables: string[]
    groupByVariable: string
    groupByVariableCategories: string[] | undefined
    windowRange: {start: number, end: number}
    prefs: PSTHPrefs
}

const PSTHUnitWidget: FunctionComponent<Props> = ({width, height, path, spikeTrainsClient, unitId, alignToVariables, groupByVariable, groupByVariableCategories, windowRange, prefs}) => {
    const topBarHeight = 40
    const groupLegendWidth = groupByVariable ? 100 : 0
    const W = (width - groupLegendWidth) / (alignToVariables.length || 1)

    const [spikeTrain, setSpikeTrain] = useState<number[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const canceler: {onCancel: (() => void)[]} = {onCancel: []}
        const load = async () => {
            const st = await spikeTrainsClient.getUnitSpikeTrain(unitId, {canceler})
            if (canceled) return
            setSpikeTrain(st)
        }
        load()
        return () => {
            canceled = true
            canceler.onCancel.forEach((c) => c())
        }
    }, [spikeTrainsClient, unitId])

    return (
        <div style={{position: 'absolute', width, height, overflow: 'hidden'}}>
            <hr />
            <div style={{position: 'absolute', width, height: topBarHeight, fontSize: 24, marginLeft: 30}}>
                Unit {unitId}
            </div>
            {
                groupLegendWidth && (
                    <div className="legend-container" style={{position: 'absolute', width: groupLegendWidth, height: height - topBarHeight, top: topBarHeight, left: width - groupLegendWidth, overflow: 'hidden'}}>
                        <PSTHGroupLegend
                            width={groupLegendWidth}
                            height={height - topBarHeight}
                            path={path}
                            groupByVariable={groupByVariable}
                            groupByVariableCategories={groupByVariableCategories}
                        />
                    </div>
                )
            }
            {
                spikeTrain ? (
                    alignToVariables.map((alignToVariable, i) => (
                        <div className="align-to-widget-container" key={alignToVariable} style={{position: 'absolute', width: W, height: height - topBarHeight, top: topBarHeight, left: i * W}}>
                            <PSTHUnitAlignToWidget
                                width={W}
                                height={height - topBarHeight}
                                path={path}
                                spikeTrain={spikeTrain}
                                unitId={unitId}
                                alignToVariable={alignToVariable}
                                groupByVariable={groupByVariable}
                                groupByVariableCategories={groupByVariableCategories}
                                windowRange={windowRange}
                                prefs={prefs}
                            />
                        </div>
                    ))
                ) : (
                    <div style={{position: 'absolute', width, height: height - topBarHeight, top: topBarHeight}}>
                        Loading spike train...
                    </div>
                )
            }
        </div>
    )
}

type PSTHUnitAlignToWidgetProps = {
    width: number
    height: number
    path: string
    spikeTrain: number[]
    unitId: string | number
    alignToVariable: string
    groupByVariable: string
    groupByVariableCategories: string[] | undefined
    windowRange: {start: number, end: number}
    prefs: PSTHPrefs
}

const PSTHUnitAlignToWidget: FunctionComponent<PSTHUnitAlignToWidgetProps> = ({width, height, path, spikeTrain, unitId, alignToVariable, groupByVariable, groupByVariableCategories, windowRange, prefs}) => {
    const nwbFile = useNwbFile()
    if (!nwbFile) throw Error('Unexpected: no nwbFile')

    const [alignToTimes, setAlignToTimes] = useState<number[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const times = await nwbFile.getDatasetData(path + '/' + alignToVariable, {})
            if (!times) throw Error(`Unable to load ${path}/${alignToVariable}`)
            if (canceled) return
            setAlignToTimes(Array.from(times))
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path, alignToVariable])

    const [groupByValues, setGroupByValues] = useState<any[] | undefined>(undefined)
    useEffect(() => {
        if (!groupByVariable) return
        let canceled = false
        const load = async () => {
            const vals = await nwbFile.getDatasetData(path + '/' + groupByVariable, {})
            if (!vals) throw Error(`Unable to load ${path}/${groupByVariable}`)
            if (canceled) return
            setGroupByValues(Array.from(vals))
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path, groupByVariable, spikeTrain])

    useEffect(() => {
        if ((!groupByVariable) && (alignToTimes)) {
            setGroupByValues(alignToTimes.map(() => undefined))
        }
    }, [groupByVariable, alignToTimes])

    const trials: {times: number[], group: any}[] | undefined = useMemo(() => {
        if (!alignToTimes) return undefined
        if (!groupByValues) return undefined
        const t1 = windowRange.start
        const t2 = windowRange.end
        const ret: {times: number[], group: any}[] = []
        let i1 = 0
        for (let iTrial = 0; iTrial < alignToTimes.length; iTrial++) {
            while ((i1 < spikeTrain.length) && (spikeTrain[i1] < alignToTimes[iTrial] + t1)) {
                i1++
            }
            let i2 = i1
            while ((i2 < spikeTrain.length) && (spikeTrain[i2] < alignToTimes[iTrial] + t2)) {
                i2++
            }
            ret.push({
                times: spikeTrain.slice(i1, i2).map(t => t - alignToTimes[iTrial]),
                group: groupByValues[iTrial]
            })
        }
        return ret
    }, [alignToTimes, spikeTrain, windowRange, groupByValues])

    const groups: {group: any, color: string}[] | undefined = useMemo(() => {
        if (!trials) return undefined
        const vals = trials.map(t => t.group)
        const uniqueVals = Array.from(new Set(vals))
        uniqueVals.sort()
        const uniqueVals2 = groupByVariableCategories ? uniqueVals.filter(v => groupByVariableCategories.includes(v + '')) : uniqueVals
        return uniqueVals2.map((val, i) => ({
            group: val,
            color: groupColorForIndex(i)
        }))
    }, [trials, groupByVariableCategories])

    const sortedTrials = useMemo(() => {
        if (!trials) return undefined
        if (!groups) return undefined
        const ret: {times: number[], group: any}[] = []
        groups.forEach(group => {
            trials.filter(trial => (trial.group === group.group)).forEach(trial => {
                ret.push(trial)
            })
        })
        return ret
    }, [trials, groups])

    if (!alignToTimes) {
        return <div>Loading alignment times...</div>
    }

    if (!groupByValues) {
        return <div>Loading group values</div>
    }

    if (!trials) {
        return <div>Loading trials...</div>
    }

    if (!groups) {
        return <div>Loading groups...</div>
    }

    if (!sortedTrials) {
        return <div>Loading sorted trials...</div>
    }

    const titleHeight = 20
    const rasterWidgetHeight = prefs.showRaster ? (prefs.showHist ? (height - titleHeight) / 2 : height - titleHeight) : 0
    const histWidgetHeight = prefs.showHist ? (height - titleHeight) - rasterWidgetHeight : 0

    return (
        <div style={{position: 'absolute', width, height}}>
            <div className="align-to-variable" style={{position: 'absolute', width, height: titleHeight, fontWeight: 'bold', textAlign: 'center'}}>
                {alignToVariable}
            </div>
            <div className="raster-widget-container" style={{position: 'absolute', width, height: rasterWidgetHeight, top: titleHeight}}>
                {prefs.showRaster && <PSTHRasterWidget
                    width={width}
                    height={rasterWidgetHeight}
                    trials={sortedTrials}
                    groups={groups}
                    windowRange={windowRange}
                    alignmentVariableName={alignToVariable}
                    showXAxisLabels={!prefs.showHist} // don't show x axis labels if hist is shown
                />}
            </div>
            <div className="hist-widget-container" style={{position: 'absolute', width, height: histWidgetHeight, top: titleHeight + rasterWidgetHeight}}>
                {prefs.showHist && <PSTHHistWidget
                    width={width}
                    height={histWidgetHeight}
                    trials={sortedTrials}
                    groups={groups}
                    windowRange={windowRange}
                    alignmentVariableName={alignToVariable}
                    prefs={prefs}
                />}
            </div>
        </div>
    )
}

type PSTHGroupLegendProps = {
    width: number
    height: number
    path: string
    groupByVariable: string
    groupByVariableCategories: string[] | undefined
}

const PSTHGroupLegend: FunctionComponent<PSTHGroupLegendProps> = ({width, height, path, groupByVariable, groupByVariableCategories}) => {
    const nwbFile = useNwbFile()
    if (!nwbFile) throw Error('Unexpected: no nwbFile')

    const [values, setValues] = useState<any[] | undefined>(undefined)
    useEffect(() => {
        let canceled = false
        const load = async () => {
            const vals = await nwbFile.getDatasetData(path + '/' + groupByVariable, {})
            if (!vals) throw Error(`Unable to load ${path}/${groupByVariable}`)
            if (canceled) return
            let vv = Array.from(vals)
            if (groupByVariableCategories) {
                vv = vv.filter(v => groupByVariableCategories.includes(v + ''))
            }
            setValues(Array.from(vv))
        }
        load()
        return () => {canceled = true}
    }, [nwbFile, path, groupByVariable, groupByVariableCategories])

    const groups: {group: any, color: string}[] = useMemo(() => {
        const vals = values
        const uniqueVals = Array.from(new Set(vals))
        uniqueVals.sort()
        return uniqueVals.map((val, i) => ({
            group: val,
            color: groupColorForIndex(i)
        }))
    }, [values])

    const itemHeight = 20
    const itemWidth = 20
    const margin = 5

    if (!values) {
        return <div>Loading values...</div>
    }

    return (
        <div style={{position: 'absolute', width, height, overflowY: 'auto'}}>
            {
                groups.map((g, i) => (
                    <div key={i} style={{position: 'absolute', width: itemWidth, height: itemHeight, top: i * (itemHeight + margin), left: 0}}>
                        <div style={{position: 'absolute', width: itemWidth, height: itemHeight, backgroundColor: g.color}}></div>
                        <div style={{position: 'absolute', width: itemWidth, height: itemHeight, paddingLeft: itemWidth + 5, paddingTop: 2, fontSize: 12}}>
                            {g.group}
                        </div>
                    </div>
                ))
            }
        </div>
    )
}

const groupColors = [
    'black',
    'red',
    'green',
    'blue',
    'orange',
    'purple',
    'cyan',
    'magenta',
    'yellow',
    'pink',
    'brown',
    'gray'
]

const groupColorForIndex = (i: number) => {
    return groupColors[i % groupColors.length]
}

export default PSTHUnitWidget