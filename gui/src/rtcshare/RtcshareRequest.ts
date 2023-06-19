import validateObject, { isArrayOf, isBoolean, isEqualTo, isNumber, isOneOf, isString, optional } from "./validateObject"

export const protocolVersion = '0.1.0'

export type RtcshareFile = {
    name: string
    size: number
    mtime: number
    content?: ArrayBuffer | undefined
}

export type RtcshareDir = {
    name: string
    files?: RtcshareFile[]
    dirs?: RtcshareDir[]
}

/////////////////////////////////////////////////////////////////////////
export type ProbeRequest = {
    type: 'probeRequest'
}

export const isProbeRequest = (x: any): x is ProbeRequest => (
    validateObject(x, {
        type: isEqualTo('probeRequest')
    })
)

export type ProbeResponse = {
    type: 'probeResponse'
    protocolVersion: string
    proxy?: boolean
}

export const isProbeResponse = (x: any): x is ProbeResponse => (
    validateObject(x, {
        type: isEqualTo('probeResponse'),
        protocolVersion: isString,
        proxy: optional(isBoolean)
    })
)

/////////////////////////////////////////////////////////////////////////
export type ReadDirRequest = {
    type: 'readDirRequest'
    path: string
}

export const isReadDirRequest = (x: any): x is ReadDirRequest => (
    validateObject(x, {
        type: isEqualTo('readDirRequest'),
        path: isString
    })
)

export type ReadDirResponse = {
    type: 'readDirResponse'
    dirs: RtcshareDir[]
    files: RtcshareFile[]
}

export const isReadDirResponse = (x: any): x is ReadDirResponse => (
    validateObject(x, {
        type: isEqualTo('readDirResponse'),
        dirs: isArrayOf(y => (validateObject(y, {
            name: isString
        }))),
        files: isArrayOf(y => (validateObject(y, {
            name: isString,
            size: isNumber,
            mtime: isNumber,
            content: optional(isString)
        })))
    })
)

/////////////////////////////////////////////////////////////////////////
export type ReadFileRequest = {
    type: 'readFileRequest'
    path: string
    start?: number
    end?: number
}

export const isReadFileRequest = (x: any): x is ReadFileRequest => (
    validateObject(x, {
        type: isEqualTo('readFileRequest'),
        path: isString,
        start: optional(isNumber),
        end: optional(isNumber)
    })
)

export type ReadFileResponse = {
    type: 'readFileResponse'
    // the data will be in the binary payload
}

export const isReadFileResponse = (x: any): x is ReadFileResponse => (
    validateObject(x, {
        type: isEqualTo('readFileResponse')
    })
)

/////////////////////////////////////////////////////////////////////////
export type WriteFileRequest = {
    type: 'writeFileRequest'
    path: string
    fileDataBase64: string
    githubAuth: {userId?: string, accessToken?: string}
}

export const isWriteFileRequest = (x: any): x is WriteFileRequest => (
    validateObject(x, {
        type: isEqualTo('writeFileRequest'),
        path: isString,
        fileDataBase64: isString,
        githubAuth: y => (
            validateObject(y, {
                userId: optional(isString),
                accessToken: optional(isString)
            })
        )
    })
)

export type WriteFileResponse = {
    type: 'writeFileResponse'
}

export const isWriteFileResponse = (x: any): x is WriteFileResponse => (
    validateObject(x, {
        type: isEqualTo('writeFileResponse')
    })
)

/////////////////////////////////////////////////////////////////////////
export type ServiceQueryRequest = {
    type: 'serviceQueryRequest'
    serviceName: string
    query: any
    userId?: string
}

export const isServiceQueryRequest = (x: any): x is ServiceQueryRequest => (
    validateObject(x, {
        type: isEqualTo('serviceQueryRequest'),
        serviceName: isString,
        query: () => (true),
        userId: optional(isString)
    })
)

export type ServiceQueryResponse = {
    type: 'serviceQueryResponse'
    result: any
    // note: the binaryPayload comes elsewhere
}

export const isServiceQueryResponse = (x: any): x is ServiceQueryResponse => (
    validateObject(x, {
        type: isEqualTo('serviceQueryResponse'),
        result: () => (true)
    })
)

/////////////////////////////////////////////////////////////////////////
export type WebrtcSignalingRequest = {
    type: 'webrtcSignalingRequest'
    clientId: string
    signal?: string
}

export const isWebrtcSignalingRequest = (x: any): x is WebrtcSignalingRequest => (
    validateObject(x, {
        type: isEqualTo('webrtcSignalingRequest'),
        clientId: isString,
        signal: optional(isString)
    })
)

export type WebrtcSignalingResponse = {
    type: 'webrtcSignalingResponse'
    signals: string[]
}

export const isWebrtcSignalingResponse = (x: any): x is WebrtcSignalingResponse => (
    validateObject(x, {
        type: isEqualTo('webrtcSignalingResponse'),
        signals: isArrayOf(isString)
    })
)

/////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////

export type RtcshareRequest =
    ProbeRequest |
    ReadDirRequest |
    ReadFileRequest |
    WriteFileRequest |
    ServiceQueryRequest |
    WebrtcSignalingRequest

export const isRtcshareRequest = (x: any): x is RtcshareRequest => (
    isOneOf([
        isProbeRequest,
        isReadDirRequest,
        isReadFileRequest,
        isWriteFileRequest,
        isServiceQueryRequest,
        isWebrtcSignalingRequest
    ])(x)
)

export type RtcshareResponse =
    ProbeResponse |
    ReadDirResponse |
    ReadFileResponse |
    WriteFileResponse |
    ServiceQueryResponse |
    WebrtcSignalingResponse

export const isRtcshareResponse = (x: any): x is RtcshareResponse => (
    isOneOf([
        isProbeResponse,
        isReadDirResponse,
        isReadFileResponse,
        isWriteFileResponse,
        isServiceQueryResponse,
        isWebrtcSignalingResponse
    ])(x)
)