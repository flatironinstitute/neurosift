import { FunctionComponent, useMemo } from "react"
import { useSelectedUnitIds } from "../../../../package/context-unit-selection/UnitSelectionContext"
import { AutocorrelogramsViewData } from "../../../../package/view-autocorrelograms"
import { AverageWaveformsViewData } from "../../../../package/view-average-waveforms"
import { DigestInfo } from "./SpikeSortingDigestView"
import UnitBox from "./UnitBox"

type UnitBoxesTabProps = {
    width: number
    height: number
    path: string
    digestInfo: DigestInfo
    autocorrelogramsViewData?: AutocorrelogramsViewData
    averageWaveformsViewData?: AverageWaveformsViewData
}

const SelectedUnitTab: FunctionComponent<UnitBoxesTabProps> = ({width, digestInfo, height, path, autocorrelogramsViewData, averageWaveformsViewData}) => {
    const {selectedUnitIds} = useSelectedUnitIds()
    const selectedUnitId = useMemo(() => {
        if (!selectedUnitIds) return undefined
        const unitIds = Array.from(selectedUnitIds)
        if (unitIds.length === 1) return unitIds[0]
        return undefined
    }, [selectedUnitIds])

    const peakAmplitude = useMemo(() => {
        let ret = 0
        if (!averageWaveformsViewData) return ret
        averageWaveformsViewData.averageWaveforms.filter(a => (a.unitId === selectedUnitId)).forEach(x => {
            x.waveform.forEach(y => {
                y.forEach(z => {
                    const abs = Math.abs(z)
                    if (abs > ret) ret = abs
                })
            })
        })
        return ret
    }, [averageWaveformsViewData, selectedUnitId])

    if (selectedUnitId === undefined) return <div>Select exactly one unit.</div>
    if (peakAmplitude === undefined) return <div>Problem computing peak amplitude.</div>

    return (
        <UnitBox
            width={width}
            height={height}
            path={path}
            autocorrelogramData={autocorrelogramsViewData ? autocorrelogramsViewData.autocorrelograms.filter(a => (a.unitId === selectedUnitId))[0] : undefined}
            averageWaveformData={averageWaveformsViewData ? averageWaveformsViewData.averageWaveforms.filter(a => (a.unitId === selectedUnitId))[0] : undefined}
            peakAmplitude={peakAmplitude}
            samplingFrequency={digestInfo.sampling_frequency}
            channelLocations={averageWaveformsViewData?.channelLocations}
            unitId={selectedUnitId}
            includeSnippets={true}
        />
    )
}

export default SelectedUnitTab