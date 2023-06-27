import { FunctionComponent, useMemo } from "react"
import { idToNum } from "../../../../package/context-unit-selection"
import { AutocorrelogramsViewData } from "../../../../package/view-autocorrelograms"
import { AverageWaveformsViewData } from "../../../../package/view-average-waveforms"
import { getUnitColor } from "../../../../package/view-units-table"
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

const scrollBarWidth = 20

const UnitBoxesTab: FunctionComponent<UnitBoxesTabProps> = ({width, height, path, digestInfo, autocorrelogramsViewData, averageWaveformsViewData}) => {
    const unitIds: (number | string)[] = useMemo(() => (digestInfo.unit_ids), [digestInfo])
    const boxes: {unitId: string | number, left: number, top: number, width: number, height: number}[] = useMemo(() => {
        let y0 = 0
        const ret = []
        for (const unitId of unitIds) {
            const boxHeight = 250
            ret.push({
                unitId,
                left: 0,
                top: y0,
                width: width - scrollBarWidth,
                height: boxHeight
            })
            y0 += boxHeight + 4
        }
        return ret
    }, [unitIds, width])

    const peakAmplitude = useMemo(() => {
        let ret = 0
        if (!averageWaveformsViewData) return ret
        averageWaveformsViewData.averageWaveforms.forEach(x => {
            x.waveform.forEach(y => {
                y.forEach(z => {
                    const abs = Math.abs(z)
                    if (abs > ret) ret = abs
                })
            })
        })
        return ret
    }, [averageWaveformsViewData])

    return (
        <div style={{position: 'absolute', width, height, background: 'white', overflowY: 'auto'}}>
            {
                boxes.map((box, ii) => (
                    <div key={ii} style={{position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, border: 'solid 1px #ccc', background: '#eee'}}>
                        <UnitBox
                            width={box.width}
                            height={box.height}
                            path={path}
                            unitId={box.unitId}
                            autocorrelogramData={autocorrelogramsViewData ? autocorrelogramsViewData.autocorrelograms.filter(a => (a.unitId === box.unitId))[0] : undefined}
                            averageWaveformData={averageWaveformsViewData ? averageWaveformsViewData.averageWaveforms.filter(a => (a.unitId === box.unitId))[0] : undefined}
                            peakAmplitude={peakAmplitude}
                            samplingFrequency={digestInfo.sampling_frequency}
                            channelLocations={averageWaveformsViewData?.channelLocations}
                            color={getUnitColor(idToNum(box.unitId))}
                        />
                    </div>
                ))
            }
        </div>
    )
}

export default UnitBoxesTab