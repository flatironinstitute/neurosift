import validateObject, { isArrayOf, isEqualTo, isNumber, isString } from "../types/validateObject";
import { TimeseriesAnnotationEvent, TimeseriesAnnotationEventType } from "./WorkerTypes";

export type TimeseriesAnnotationFileData = {
    type: 'TimeseriesAnnotation'
    events: TimeseriesAnnotationEvent[]
    event_types: TimeseriesAnnotationEventType[]
}

export const isTimeseriesAnnotationFileData = (x: any): x is TimeseriesAnnotationFileData => {
    return validateObject(x, {
        type: isEqualTo('TimeseriesAnnotation'),
        events: isArrayOf(y => (validateObject(y, {
            s: isNumber,
            e: isNumber,
            t: isString,
            i: isString
        }))),
        event_types: isArrayOf(y => (validateObject(y, {
            event_type: isString,
            label: isString,
            color_index: isNumber
        })))
    })
}