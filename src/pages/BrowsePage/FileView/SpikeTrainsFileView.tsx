import { FunctionComponent, useEffect, useState } from "react";
import deserializeReturnValue from "../../../deserializeReturnValue";
import { RasterPlotView2, RasterPlotView2Data } from "../../../package/spike_sorting/view-raster-plot-2";
import { useRtcshare } from "../../../rtcshare/useRtcshare";
import validateObject, { isArrayOf, isEqualTo, isNumber, isOneOf, isString } from "../../../types/validateObject";

type Props = {
    width: number
    height: number
    filePath: string
}

export type SpikeTrainsFileData = {
    type: 'SpikeTrains'
    startTimeSec: number
    endTimeSec: number
    spikeTrains: {
        unitId: number | string
        spikeTimesSec: number[]
    }[]
}

export const isSpikeTrainsFileData = (x: any): x is SpikeTrainsFileData => {
    return validateObject(x, {
        type: isEqualTo('SpikeTrains'),
        startTimeSec: isNumber,
        endTimeSec: isNumber,
        spikeTrains: isArrayOf(y => (validateObject(y, {
            unitId: isOneOf([isNumber, isString]),
            spikeTimesSec: () => (true)
        })))
    })
}

const SpikeTrainsFileView: FunctionComponent<Props> = ({width, height, filePath}) => {
    const [text, setText] = useState<string | undefined>(undefined)

    const {client} = useRtcshare()

    useEffect(() => {
        let canceled = false
        if (!client) return
        ; (async () => {
            const buf = await client.readFile(filePath)
            if (canceled) return
            // array buffer to text
            const decoder = new TextDecoder('utf-8')
            const txt = decoder.decode(buf)
            setText(txt)
        })()
        return () => {canceled = true}
    }, [client, filePath])

    const [viewData, setViewData] = useState<RasterPlotView2Data | undefined>(undefined)

    useEffect(() => {
        let canceled = false
        if (!text) return
        ; (async () => {
            const d = await deserializeReturnValue(JSON.parse(text))
            if (canceled) return
            if (!isSpikeTrainsFileData(d)) {
                console.warn(d)
                console.warn('Invalid spike trains file data')
                return
            }
            const vd: RasterPlotView2Data = {
                type: 'RasterPlot',
                startTimeSec: d.startTimeSec,
                endTimeSec: d.endTimeSec,
                plots: d.spikeTrains.map(st => ({
                    unitId: st.unitId,
                    spikeTimesSec: st.spikeTimesSec
                })),
                hideToolbar: false
            }
            setViewData(vd)
        })()
        return () => {canceled = true}
    }, [text])

    if (!viewData) {
        return (
            <div style={{position: 'absolute', width, height, background: 'white'}}>
                Loading...
            </div>
        )
    }

    return (
        <RasterPlotView2
            data={viewData}
            width={width}
            height={height}
        />
    )
}

export default SpikeTrainsFileView