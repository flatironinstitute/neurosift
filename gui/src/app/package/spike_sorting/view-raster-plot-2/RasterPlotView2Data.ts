/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArrayOf, isOneOf, isString, isEqualTo, isNumber, optional, isBoolean, validateObject } from "@fi-sci/misc"
import { HighlightIntervalSet, isHighlightIntervalSet } from "../../component-time-scroll-view"

type RPPlotData = {
    unitId: number | string
    spikeTimesSec: number[]
}

const isRPPlotData = (x: any): x is RPPlotData => {
    return validateObject(x, {
        unitId: isOneOf([isNumber, isString]),
        spikeTimesSec: isArrayOf(isNumber)
    })
}

export type RasterPlotView2Data = {
    type: 'RasterPlot'
    startTimeSec: number
    endTimeSec: number
    plots: RPPlotData[]
    highlightIntervals?: HighlightIntervalSet[]
    hideToolbar?: boolean
}

export const isRasterPlotView2Data = (x: any): x is RasterPlotView2Data => {
    return validateObject(x, {
        type: isEqualTo('RasterPlot'),
        startTimeSec: isNumber,
        endTimeSec: isNumber,
        plots: isArrayOf(isRPPlotData),
        highlightIntervals: optional(isArrayOf(isHighlightIntervalSet)),
        hideToolbar: optional(isBoolean)
    })
}