import { default as validateObject, isEqualTo, isNumber, isString, optional } from "../../../../types/validateObject"

export type AnnotatedVideoNode = {
    id: string
    label: string
    colorIndex?: number
}

export type AnnotatedVideoViewData = {
    type: 'AnnotatedVideo',
    videoUri?: string
    videoWidth: number
    videoHeight: number
    videoNumFrames: number
    samplingFrequency: number
    annotationUri?: string
    positionDecodeFieldUri?: string
}

export const isAnnotatedVideoViewData = (x: any): x is AnnotatedVideoViewData => {
    return validateObject(x, {
        type: isEqualTo('AnnotatedVideo'),
        videoUri: optional(isString),
        videoWidth: isNumber,
        videoHeight: isNumber,
        videoNumFrames: isNumber,
        samplingFrequency: isNumber,
        annotationUri: optional(isString),
        positionDecodeFieldUri: optional(isString)
    })
}