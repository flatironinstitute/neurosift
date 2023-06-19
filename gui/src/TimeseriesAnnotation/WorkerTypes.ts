export type Opts = {
    canvasWidth: number
    canvasHeight: number
    margins: {left: number, right: number, top: number, bottom: number}
    visibleStartTimeSec: number
    visibleEndTimeSec: number
}

export type TimeseriesAnnotationEvent = {
    s: number // start time sec
    e: number // end time sec
    t: string // event type
    i: string // event id
}

export type TimeseriesAnnotationEventType = {
    event_type: string
    label: string
    color_index: number
}