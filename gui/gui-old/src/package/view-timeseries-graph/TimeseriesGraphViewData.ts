import { isTimeseriesAnnotationFileData, TimeseriesAnnotationFileData } from "../../TimeseriesAnnotation/TimeseriesAnnotationFileData"
import { default as validateObject, isArrayOf, isBoolean, isEqualTo, isNumber, isString, optional } from "../../types/validateObject"

type LegendOpts = {
    location: 'northwest' | 'northeast'
}

type GridlineOpts = {
    hideX: boolean
    hideY: boolean
}

type Dataset = {
    name: string
    data: {[key: string]: any}
}

type Series = {
    type: string
    dataset: string
    title?: string
    encoding: {[key: string]: any}
    attributes: {[key: string]: any}
}

export type TimeseriesGraphDataAttributes = {
    type: 'neurosift.TimeseriesGraphData'
    start_time: number
    end_time: number
    time_offset?: number
    legend_opts?: LegendOpts
    y_range?: [number, number]
    gridline_opts?: GridlineOpts
    series: Series[]
    datasets: {
        name: string
    }[]
}

export type TimeseriesGraphDataBlockAttributes = {
    start_time: number
    end_time: number
    series: Series[]
    datasets: {
        name: string
        keys: string[]
    }[]
}

export type TimeseriesGraphViewData = {
    type: 'TimeseriesGraph',
    datasets: Dataset[],
    series: Series[]
    timeOffset?: number
    legendOpts?: LegendOpts
    yRange?: [number, number]
    gridlineOpts?: GridlineOpts
    hideToolbar?: boolean
    annotation?: TimeseriesAnnotationFileData
}

export const isTimeseriesGraphViewData = (x: any): x is TimeseriesGraphViewData => {
    return validateObject(x, {
        type: isEqualTo('TimeseriesGraph'),
        datasets: isArrayOf(y => (validateObject(y, {
            name: isString,
            data: () => (true)
        }))),
        series: isArrayOf(y => (validateObject(y, {
            type: isString,
            dataset: isString,
            encoding: () => (true),
            attributes: () => (true),
            title: optional(isString)
        }))),
        timeOffset: optional(isNumber),
        legendOpts: optional((y: any) => validateObject(y, {
            location: isString
        })),
        yRange: optional(isArrayOf(isNumber)),
        gridlineOpts: optional((y: any) => validateObject(y, {
            hideX: isBoolean,
            hideY: isBoolean
        })),
        hideToolbar: optional(isBoolean),
        annotation: optional(isTimeseriesAnnotationFileData)
    }, {allowAdditionalFields: true})
}