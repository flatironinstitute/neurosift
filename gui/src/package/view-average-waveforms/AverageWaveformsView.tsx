import { mean } from 'mathjs';
import { FunctionComponent, useCallback, useEffect, useMemo, useState } from 'react';
import { FaMinus, FaPlus } from 'react-icons/fa';
import { getUnitColor } from '../view-units-table/unitColors';
import { defaultUnitsTableBottomToolbarOptions, ToolbarItem, UnitsTableBottomToolbar, UnitsTableBottomToolbarOptions, ViewToolbar } from '../ViewToolbar';
import AverageWaveformPlot, { AverageWaveformPlotProps } from './AverageWaveformPlot';
import { AverageWaveformsViewData } from './AverageWaveformsViewData';
import { FaArrowRight, FaArrowLeft, FaRegTimesCircle } from 'react-icons/fa'
import { idToNum, INITIALIZE_UNITS, sortIds, useSelectedUnitIds } from '../context-unit-selection';
import { PGPlot, PlotGrid } from '../component-plot-grid';
import { AmplitudeScaleToolbarEntries } from '../AmplitudeScaleToolbarEntries';
import Splitter from '../../components/Splitter';
import { VerticalScrollView } from '../component-vertical-scroll-view';
import { transpose } from '../../pages/BrowsePage/FileView/SpikeSortingDigestView/SnippetsView/SnippetsPlot';

type Props = {
    data: AverageWaveformsViewData
    width: number
    height: number
}

const AverageWaveformsView: FunctionComponent<Props> = ({data, width, height}) => {
    const allChannelIds = useMemo(() => {
        const allChannelIds: (string | number)[] = []
        for (const x of data.averageWaveforms) {
            for (const id of x.channelIds) {
                if (!allChannelIds.includes(id)) {
                    allChannelIds.push(id)
                }
            }
        }
        return sortIds(allChannelIds)
    }, [data.averageWaveforms])
    const [toolbarOptions, setToolbarOptions] = useState<UnitsTableBottomToolbarOptions>({...defaultUnitsTableBottomToolbarOptions, onlyShowSelected: false})
    const {selectedUnitIds, currentUnitId, orderedUnitIds, plotClickHandlerGenerator, unitIdSelectionDispatch} = useSelectedUnitIds()

    const [ampScaleFactor, setAmpScaleFactor] = useState<number>(6)
    const [waveformsMode, setWaveformsMode] = useState<'geom' | 'vertical'>('geom')
    const [showWaveformStdev, setShowWaveformStdev] = useState<boolean>(true)
    const [showChannelIds, setShowChannelIds] = useState<boolean>(false)
    const [showReferenceProbe, setShowReferenceProbe] = useState<boolean>(data.showReferenceProbe || false)
    const [showOverlapping, setShowOverlapping] = useState<boolean>(false)

    const [horizontalStretchFactor, setHorizontalStretchFactor] = useState(1)
    const [hideElectrodes, setHideElectrodes] = useState(true)

    const [useUnitColors, setUseUnitColors] = useState(true)

    useEffect(() => {
        unitIdSelectionDispatch({ type: INITIALIZE_UNITS, newUnitOrder: sortIds(data.averageWaveforms.map(aw => aw.unitId)) })
    }, [data.averageWaveforms, unitIdSelectionDispatch])

    const [plotBoxScaleFactor, setPlotBoxScaleFactor] = useState<number>(2)

    const peakAmplitude = useMemo(() => {
        let ret = 0
        data.averageWaveforms.forEach(x => {
            x.waveform.forEach(y => {
                y.forEach(z => {
                    const abs = Math.abs(z)
                    if (abs > ret) ret = abs
                })
            })
        })
        return ret
    }, [data.averageWaveforms])

    const plots: PGPlot[] = useMemo(() => data.averageWaveforms.filter(a => (toolbarOptions.onlyShowSelected ? (selectedUnitIds.has(a.unitId)) : true)).map(aw => {
        const waveform = transpose(aw.waveform)
        const waveformStdev = aw.waveformStdDev ? transpose(aw.waveformStdDev) : undefined
        const units: {
            channelIds: (number | string)[];
            waveform: number[][];
            waveformStdDev?: number[][];
            waveformColor: string;
        }[] = [
            {
                channelIds: aw.channelIds,
                waveform: subtractChannelMeans(waveform),
                waveformStdDev: showWaveformStdev && !showOverlapping ? waveformStdev : undefined,
                waveformColor: getUnitColor(idToNum(aw.unitId))
            }
        ]

        const baseBoxWidth = 30
        const baseBoxHeight = 100

        const props: AverageWaveformPlotProps = {
            allChannelIds,
            channelIds: aw.channelIds,
            units,
            layoutMode: waveformsMode,
            hideElectrodes,
            channelLocations: data.channelLocations,
            samplingFrequency: data.samplingFrequency,
            peakAmplitude,
            ampScaleFactor,
            horizontalStretchFactor,
            showChannelIds,
            useUnitColors,
            width: baseBoxWidth * plotBoxScaleFactor + (showReferenceProbe ? (baseBoxWidth * plotBoxScaleFactor / 4) : 0),
            height: baseBoxHeight * plotBoxScaleFactor,
            showReferenceProbe,
            disableAutoRotate: true
        }
        return {
            unitId: aw.unitId,
            key: aw.unitId,
            label: `Unit ${aw.unitId}`,
            labelColor: getUnitColor(idToNum(aw.unitId)),
            clickHandler: !toolbarOptions.onlyShowSelected ? plotClickHandlerGenerator(aw.unitId) : undefined,
            props
        }
    }), [data.averageWaveforms, data.channelLocations, data.samplingFrequency, allChannelIds, peakAmplitude, waveformsMode, ampScaleFactor, plotClickHandlerGenerator, toolbarOptions.onlyShowSelected, selectedUnitIds, plotBoxScaleFactor, showWaveformStdev, showChannelIds, showReferenceProbe, showOverlapping, horizontalStretchFactor, hideElectrodes, useUnitColors])

    const plots2: PGPlot[] = useMemo(() => {
        if (orderedUnitIds) {
            return orderedUnitIds.map(unitId => (plots.filter(a => (a.unitId === unitId))[0])).filter(p => (p !== undefined))
        }
        else return plots
    }, [plots, orderedUnitIds])

    const plots3: PGPlot[] = useMemo(() => {
        if (showOverlapping) {
            return combinePlotsForOverlappingView(plots2)
        }
        return plots2
    }, [plots2, showOverlapping])

    const horizontalStretchToolbarEntries: ToolbarItem[] = useMemo(() => {
        return [
            {
                type: 'button',
                callback: () => {setHorizontalStretchFactor(x => (x * 1.1))},
                title: 'Increase horizontal stretch [alt + mouse-wheel]',
                icon: <FaArrowRight />
            },
            // {
            //     type: 'button',
            //     callback: () => {setHorizontalStretchFactor(1)},
            //     title: 'Reset scale amplitude',
            //     icon: <FaRegTimesCircle />
            // },
            {
                type: 'button',
                callback: () => {setHorizontalStretchFactor(x => (x / 1.1))},
                title: 'Decrease horizontal stretch [alt + mouse-wheel]',
                icon: <FaArrowLeft />
            },
        ]
    }, [])

    const customToolbarActions = useMemo(() => {
        const amplitudeScaleToolbarEntries = AmplitudeScaleToolbarEntries({ampScaleFactor, setAmpScaleFactor})
        const showElectrodeGeometryAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setWaveformsMode(m => (m === 'geom' ? 'vertical' : 'geom')),
            title: 'Show electrode geometry',
            selected: waveformsMode === 'geom'
        }
        const showElectrodesAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setHideElectrodes(v => (!v)),
            title: 'Show electrodes',
            selected: !hideElectrodes
        }
        const boxSizeActions: ToolbarItem[] = [
            {
                type: 'button',
                callback: () => setPlotBoxScaleFactor(s => (s * 1.3)),
                title: 'Increase box size',
                icon: <FaPlus />
            },
            {
                type: 'button',
                callback: () => setPlotBoxScaleFactor(s => (s / 1.3)),
                title: 'Decrease box size',
                icon: <FaMinus />
            }
        ]
        const showWaveformStdevAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setShowWaveformStdev(a => (!a)),
            title: 'Show waveform stdev',
            selected: showWaveformStdev === true
        }
        const showChannelIdsAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setShowChannelIds(a => (!a)),
            title: 'Show channel IDs',
            selected: showChannelIds === true
        }
        const showReferenceProbeAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setShowReferenceProbe(a => (!a)),
            title: 'Show reference probes',
            selected: showReferenceProbe === true
        }
        const showOverlappingAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setShowOverlapping(a => (!a)),
            title: 'Show overlapping',
            selected: showOverlapping === true
        }
        const useUnitColorsAction: ToolbarItem = {
            type: 'toggle',
            subtype: 'checkbox',
            callback: () => setUseUnitColors(a => (!a)),
            title: 'Use unit colors',
            selected: useUnitColors === true
        }
        return [
            {type: 'divider'},
            ...boxSizeActions,
            {type: 'divider'},
            ...amplitudeScaleToolbarEntries,
            {type: 'divider'},
            ...horizontalStretchToolbarEntries,
            {type: 'divider'},
            showElectrodeGeometryAction,
            showElectrodesAction,
            {type: 'divider'},
            showWaveformStdevAction,
            {type: 'divider'},
            showChannelIdsAction,
            {type: 'divider'},
            showReferenceProbeAction,
            {type: 'divider'},
            showOverlappingAction,
            {type: 'divider'},
            useUnitColorsAction
        ]
    }, [waveformsMode, ampScaleFactor, showWaveformStdev, showChannelIds, showOverlapping, showReferenceProbe, horizontalStretchToolbarEntries, hideElectrodes, useUnitColors])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if ((e.shiftKey) && (!e.altKey)) {
            if (e.deltaY < 0) {
                setAmpScaleFactor(s => (s * 1.3))
            }
            else {
                setAmpScaleFactor(s => (s / 1.3))
            }
            // note: we cannot prevent default here, so that's done below in setupDivRef
        }
        else if ((e.altKey) && (!e.shiftKey)) {
            if (e.deltaY < 0) {
                setHorizontalStretchFactor(s => (s * 1.1))
            }
            else {
                setHorizontalStretchFactor(s => (s / 1.1))
            }
            // note: we cannot prevent default here, so that's done below in setupDivRef
        }
    }, [])

    const bottomToolbarHeight = 30

    const setupDivRef = useCallback((elmt: HTMLDivElement | null) => {
        if (!elmt) return
        elmt.addEventListener('wheel', e => {
            if ((e.shiftKey) || (e.altKey)) {
                e.preventDefault()
            }
        })
    }, [])

    const viewToolbarWidth = 45

    const TOOLBAR_WIDTH = viewToolbarWidth // hard-coded for now
    return (
        <div
            ref={elmt => setupDivRef(elmt)}
            onWheel={handleWheel}
        >
            <Splitter
                width={width}
                height={height - bottomToolbarHeight}
                initialPosition={TOOLBAR_WIDTH}
                adjustable={false}
            >
                <ViewToolbar
                    width={TOOLBAR_WIDTH}
                    height={height}
                    customActions={customToolbarActions}
                />
                <VerticalScrollView width={0} height={0}>
                    <PlotGrid
                        plots={plots3}
                        plotComponent={AverageWaveformPlot}
                        selectedPlotKeys={!toolbarOptions.onlyShowSelected ? selectedUnitIds : undefined}
                        currentPlotKey={currentUnitId}
                    />
                </VerticalScrollView>
            </Splitter>
            <div style={{position: 'absolute', top: height - bottomToolbarHeight, height: bottomToolbarHeight, overflow: 'hidden'}}>
                <UnitsTableBottomToolbar
                    options={toolbarOptions}
                    setOptions={setToolbarOptions}
                />
            </div>
        </div>
    )
}

const combinePlotsForOverlappingView = (plots: PGPlot[]): PGPlot[] => {
    if (plots.length === 0) return plots
    const thePlot: PGPlot = {...plots[0], props: {...plots[0].props}}

    const plotProps: AverageWaveformPlotProps = thePlot.props as any as AverageWaveformPlotProps
    thePlot.key = 'overlapping'
    thePlot.label = 'Overlapping'
    thePlot.labelColor = 'black'
    thePlot.unitId = 'overlapping'
    plotProps.height *= 3
    // plotProps.width *= 2

    const allChannelIdsSet = new Set<number | string>()
    for (const plot of plots) {
        for (const id of plot.props.channelIds) {
            allChannelIdsSet.add(id)
        }
    }
    const allChannelIds = sortIds([...allChannelIdsSet])
    plotProps.channelIds = allChannelIds
    
    plotProps.units = plots.map(p => (p.props.units[0]))

    return [thePlot]
}

const subtractChannelMeans = (waveform: number[][]): number[][] => {
    return waveform.map(W => {
        const mean0 = computeMean(W)
        return W.map(a => (a - mean0))
    })
}

const computeMean = (ary: number[]) => ary.length > 0 ? mean(ary) : 0

export default AverageWaveformsView