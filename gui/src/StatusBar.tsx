import { createContext, FunctionComponent, useCallback, useContext } from "react";
import { useRtcshareConnection } from "./RtcshareConnection/RtcshareConnectionContext";

type Props = {
    width: number
    height: number
}

export const connectedColor = '#050'
export const notConnectedColor = '#888'

// export const statusBarHeight = 18
export const statusBarHeight = 0

type CustomStatusBarStrings = {
    [key: string]: string
}
type CustomStatusBarAction = {
    type: 'set'
    key: string
    value: string
}
export const customStatusBarStringsReducer = (state: CustomStatusBarStrings, action: CustomStatusBarAction): CustomStatusBarStrings => {
    if (action.type === 'set') {
        if (state[action.key] === action.value) return state // this is important to avoid unnecessary re-renders
        return {
            ...state,
            [action.key]: action.value
        }
    }
    else return state
}
export const CustomStatusBarStringsContext = createContext<{customStatusBarStrings: CustomStatusBarStrings, customStatusBarStringsDispatch: (action: CustomStatusBarAction) => void} | null>(null)

export const useCustomStatusBarStrings = () => {
    const {customStatusBarStrings, customStatusBarStringsDispatch} = useContext(CustomStatusBarStringsContext) || {}
    const setCustomStatusBarString = useCallback((key: string, value: string) => {
        customStatusBarStringsDispatch && customStatusBarStringsDispatch({type: 'set', key, value})
    }, [customStatusBarStringsDispatch])
    return {
        customStatusBarStrings: customStatusBarStrings || {},
        setCustomStatusBarString
    }
}

const StatusBar: FunctionComponent<Props> = ({width, height}) => {
    const {rtcshareAvailable, rtcshareUrl} = useRtcshareConnection()
    const {customStatusBarStrings} = useCustomStatusBarStrings()
    return (
        <div style={{fontSize: 12, paddingTop: 3, paddingLeft: 5}}>
            {
                rtcshareAvailable === undefined ? (
                    <span>Checking Rtcshare connectivity...</span>
                ) : rtcshareAvailable ? (
                    <span style={{color: connectedColor}}>Connected to rtcshare at {rtcshareUrl}</span>
                ) : (
                    <span style={{color: notConnectedColor}}>Unable to connect to rtcshare at {rtcshareUrl}</span>
                )
            }
            {/* The following is flush right */}
            <span style={{position: 'absolute', right: 5, color: 'gray'}}>
                {
                    Object.keys(customStatusBarStrings || {}).map(key => (
                        <span key={key} style={{paddingLeft: 10}}>
                            {(customStatusBarStrings || {})[key]}
                        </span>
                    ))
                }
            </span>
        </div>
    )
}

export default StatusBar