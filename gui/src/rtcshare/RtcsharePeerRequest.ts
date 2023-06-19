import { isRtcshareRequest, isRtcshareResponse, RtcshareRequest, RtcshareResponse } from "./RtcshareRequest"
import validateObject, { isEqualTo, isString, optional } from "./validateObject"

export type RtcsharePeerRequest = {
    type: 'rtcsharePeerRequest'
    request: RtcshareRequest
    requestId: string
}

export const isRtcsharePeerRequest = (x: any): x is RtcsharePeerRequest => (
    validateObject(x, {
        type: isEqualTo('rtcsharePeerRequest'),
        request: isRtcshareRequest,
        requestId: isString
    })
)

export type RtcsharePeerResponse = {
    type: 'rtcsharePeerResponse'
    response?: RtcshareResponse
    error?: string
    requestId: string
}

export const isRtcsharePeerResponse = (x: any): x is RtcsharePeerResponse => (
    validateObject(x, {
        type: isEqualTo('rtcsharePeerResponse'),
        response: optional(isRtcshareResponse),
        error: optional(isString),
        requestId: isString
    })
)