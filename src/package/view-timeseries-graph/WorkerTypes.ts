export type Opts = {
    canvasWidth: number
    canvasHeight: number
    margins: {left: number, right: number, top: number, bottom: number}
    visibleStartTimeSec: number
    visibleEndTimeSec: number
    minValue: number
    maxValue: number
    hideLegend: boolean
    legendOpts: {location: 'northwest' | 'northeast'}
}

export type ResolvedSeries = {
    type: string
    dataset: string
    title?: string
    encoding: {[key: string]: any}
    attributes: {[key: string]: any}
    t: number[]
    y: number[]
}