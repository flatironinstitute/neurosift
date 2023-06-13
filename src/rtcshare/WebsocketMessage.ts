import validateObject, { isEqualTo, isString } from "./validateObject"

export type WebsocketMessage = {
    type: 'signal'
    signal: string
}

export const isWebsocketMessage = (x: any): x is WebsocketMessage => (
    validateObject(x, {
        type: isEqualTo('signal'),
        signal: isString
    })
)