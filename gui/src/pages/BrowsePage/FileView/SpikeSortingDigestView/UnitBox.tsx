import { FunctionComponent, useMemo } from "react"
import { idToNum } from "../../../../package/context-unit-selection"
import { CorrelogramPlot } from "../../../../package/view-autocorrelograms"
import { AutocorrelogramData } from "../../../../package/view-autocorrelograms/AutocorrelogramsViewData"
import { AverageWaveformData } from "../../../../package/view-average-waveforms/AverageWaveformsViewData"
import { WaveformColors } from "../../../../package/view-average-waveforms/WaveformWidget/WaveformPlot"
import WaveformWidget from "../../../../package/view-average-waveforms/WaveformWidget/WaveformWidget"
import SnippetsView from "./SnippetsView/SnippetsView"
import SpikeAmplitudesBox from "./SpikeAmplitudesBox"

type Props = {
    width: number
    height: number
    path: string
    unitId: number | string
    autocorrelogramData?: AutocorrelogramData
    averageWaveformData?: AverageWaveformData
    peakAmplitude: number
    samplingFrequency: number
    channelLocations?: {[id: string]: number[]}
    color?: string
    includeSnippets?: boolean
}

const UnitBox: FunctionComponent<Props> = ({width, height, path, unitId, autocorrelogramData, averageWaveformData, peakAmplitude, samplingFrequency, channelLocations, color, includeSnippets}) => {
    const topBarHeight = 25
    const H = height - topBarHeight
    const autocorrelogramWidth = Math.max(100, Math.min(300, width / 3))
    const autocorrelogramHeight = includeSnippets ? H / 4 : height / 3
    const spikeAmplitudesHeight = includeSnippets ? H / 2 : 2 * height / 3
    const snippetsHeight = includeSnippets ? H / 4 : 0
    const boxes: {name: string, left: number, top: number, width: number, height: number}[] = [
        {
            name: 'top_bar',
            left: 0,
            top: 0,
            width: width,
            height: topBarHeight
        },
        {
            name: 'autocorrelogram',
            left: 0,
            top: topBarHeight,
            width: autocorrelogramWidth,
            height: autocorrelogramHeight
        },
        {
            name: 'average_waveform',
            left: autocorrelogramWidth,
            top: topBarHeight,
            width: width - autocorrelogramWidth,
            height: autocorrelogramHeight
        },
        {
            name: 'spike_amplitudes',
            left: 0,
            top: topBarHeight + autocorrelogramHeight,
            width: width,
            height: spikeAmplitudesHeight
        }
    ]
    if (includeSnippets) {
        boxes.push({
            name: 'snippets',
            left: 0,
            top: topBarHeight + autocorrelogramHeight + spikeAmplitudesHeight,
            width: width,
            height: snippetsHeight
        })  
    }
    const channelLocations2 = useMemo(() => {
        // rotate 90 degrees
        const ret: {[id: string]: number[]} = {}
        for (const id in channelLocations) {
            const loc = channelLocations[id]
            ret[id] = [loc[1], loc[0]]
        }
        return ret
    }, [channelLocations])
    return (
        <div style={{position: 'absolute', width, height, background: 'white', border: 'solid 1px #ccc'}}>
            {
                boxes.map((box, ii) => (
                    <div key={ii} style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height}}>
                        {
                            box.name === 'top_bar' ? (
                                <div>
                                    Unit {unitId}
                                </div>
                            ) : box.name === 'autocorrelogram' && autocorrelogramData ? (
                                <AutocorrelogramBox
                                    width={box.width}
                                    height={box.height}
                                    autocorrelogramData={autocorrelogramData}
                                    color={color}
                                />
                            ) : box.name === 'average_waveform' && averageWaveformData && channelLocations ? (
                                <AverageWaveformBox
                                    width={box.width}
                                    height={box.height}
                                    averageWaveformData={averageWaveformData}
                                    peakAmplitude={peakAmplitude}
                                    samplingFrequency={samplingFrequency}
                                    channelLocations={channelLocations2}
                                />
                            ) : box.name === 'spike_amplitudes' ? (
                                <SpikeAmplitudesBox
                                    width={box.width}
                                    height={box.height}
                                    path={path}
                                    unitId={unitId}
                                    samplingFrequency={samplingFrequency}
                                    color={color}
                                />
                            ) : box.name === 'snippets' ? (
                                <SnippetsView
                                    width={box.width}
                                    height={box.height}
                                    ssdPath={path}
                                    unitId={unitId}
                                    samplingFrequency={samplingFrequency}
                                    singleRow={true}
                                />
                            ) : <span />
                        }
                    </div>
                ))
            }
        </div>
    )
}

type AutocorrelogramBoxProps = {
    width: number
    height: number
    autocorrelogramData: AutocorrelogramData
    color?: string
}

const AutocorrelogramBox: FunctionComponent<AutocorrelogramBoxProps> = ({width, height, autocorrelogramData, color}) => {
    return (
        <CorrelogramPlot
            binEdgesSec={autocorrelogramData.binEdgesSec}
            binCounts={autocorrelogramData.binCounts}
            color={color || 'black'}
            width={width}
            height={height}
            hideXAxis={true}
        />
    )
}

type AverageWaveformBoxProps = {
    width: number
    height: number
    averageWaveformData: AverageWaveformData
    peakAmplitude: number
    samplingFrequency: number
    channelLocations: {[id: string]: number[]}
}

const AverageWaveformBox: FunctionComponent<AverageWaveformBoxProps> = ({width, height, averageWaveformData, peakAmplitude, samplingFrequency, channelLocations}) => {
    const channelIds = averageWaveformData.channelIds
    const electrodes = useMemo(() => {
        const locs = channelLocations || {}
        return channelIds.map(channelId => ({
            id: channelId,
            label: `${channelId}`,
            x: locs[`${channelId}`] !== undefined ? locs[`${channelId}`][0] : idToNum(channelId),
            y: locs[`${channelId}`] !== undefined ? locs[`${channelId}`][1] : 0
        }))
    }, [channelIds, channelLocations])
    const waveforms = useMemo(() => {
        const waveformColors: WaveformColors = {
            base: 'black'
        }
        const electrodeIndices = []
        for (const id of channelIds) {
            electrodeIndices.push(electrodes.map(e => (e.id)).indexOf(id))
        }
        return [
            {
                electrodeIndices,
                waveform: averageWaveformData.waveform,
                waveformStdDev: averageWaveformData.waveformStdDev,
                waveformColors
            }
        ]    
    }, [averageWaveformData, electrodes, channelIds])
    const waveformsTransposed = useMemo(() => (
        waveforms.map(w => ({
            electrodeIndices: w.electrodeIndices,
            waveform: w.waveform[0].map((_, i) => (w.waveform.map(row => (row[i])))),
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            waveformStdDev: w.waveformStdDev ? w.waveformStdDev[0].map((_, i) => ((w.waveformStdDev!).map(row => (row[i])))): undefined,
            waveformColors: w.waveformColors
        }))
    ), [waveforms])

    return (
        <WaveformWidget
            waveforms={waveformsTransposed}
            ampScaleFactor={6}
            horizontalStretchFactor={1}
            electrodes={electrodes}
            layoutMode="geom"
            hideElectrodes={true}
            width={width}
            height={height}
            peakAmplitude={peakAmplitude}
            samplingFrequency={samplingFrequency}
            showChannelIds={false}
            useUnitColors={true}
            waveformWidth={2}
            disableAutoRotate={true}
        />
    )
}
        

export default UnitBox