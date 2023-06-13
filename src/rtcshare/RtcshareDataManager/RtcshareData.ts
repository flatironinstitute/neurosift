import React from 'react'
import RtcshareFileSystemClient from './RtcshareFileSystemClient'

export type RtcshareData = {
    client?: RtcshareFileSystemClient
    connectedToService?: boolean
    webrtcConnectionStatus?: 'unused' | 'pending' | 'connected' | 'error'
    usingProxy?: boolean
}

export const initialRtcshareData: RtcshareData = {
}

export const RtcshareContext = React.createContext<{ data: RtcshareData, dispatch: (a: RtcshareAction) => void, checkConnectionStatus: () => void }>({
    data: initialRtcshareData,
    dispatch: () => { },
    checkConnectionStatus: () => {}
})

export type RtcshareAction = {
    type: 'setClient'
    client: RtcshareFileSystemClient
} | {
    type: 'setConnectedToService'
    connected: boolean | undefined
} | {
    type: 'setWebrtcConnectionStatus'
    status: 'unused' | 'pending' | 'connected' | 'error'
} | {
    type: 'setUsingProxy'
    usingProxy: boolean | undefined
}

export const rtcshareReducer = (s: RtcshareData, a: RtcshareAction): RtcshareData => {
    if (a.type === 'setClient') {
        return {
            ...s,
            client: a.client
        }
    }
    else if (a.type === 'setConnectedToService') {
        return {
            ...s,
            connectedToService: a.connected
        }
    }
    else if (a.type === 'setWebrtcConnectionStatus') {
        return {
            ...s,
            webrtcConnectionStatus: a.status
        }
    }
    else if (a.type === 'setUsingProxy') {
        return {
            ...s,
            usingProxy: a.usingProxy
        }
    }
    else return s
}