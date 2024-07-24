/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, FunctionComponent, useCallback, useContext } from "react";

type Props = {
    width: number
    height: number
}

export const connectedColor = '#050'
export const notConnectedColor = '#888'

export const statusBarHeight = 18
// export const statusBarHeight = 0

type CustomStatusBarElements = {
    [key: string]: any
}
type CustomStatusBarAction = {
    type: 'set'
    key: string
    value: string
}
export const customStatusBarElementsReducer = (state: CustomStatusBarElements, action: CustomStatusBarAction): CustomStatusBarElements => {
    if (action.type === 'set') {
        if (state[action.key] === action.value) return state // this is important to avoid unnecessary re-renders
        return {
            ...state,
            [action.key]: action.value
        }
    }
    else return state
}
export const CustomStatusBarElementsContext = createContext<{customStatusBarElements: CustomStatusBarElements, customStatusBarElementsDispatch: (action: CustomStatusBarAction) => void} | null>(null)

export const useCustomStatusBarElements = () => {
    const {customStatusBarElements, customStatusBarElementsDispatch} = useContext(CustomStatusBarElementsContext) || {}
    const setCustomStatusBarElement = useCallback((key: string, value: any) => {
        customStatusBarElementsDispatch && customStatusBarElementsDispatch({type: 'set', key, value})
    }, [customStatusBarElementsDispatch])
    return {
        customStatusBarElements: customStatusBarElements || {},
        setCustomStatusBarElement
    }
}

const StatusBar: FunctionComponent<Props> = ({width, height}) => {
    const {customStatusBarElements} = useCustomStatusBarElements()
    return (
        <div style={{fontSize: 12, paddingTop: 3, paddingLeft: 5}}>
            {/* The following is flush right */}
            <span style={{position: 'absolute', right: 5, color: 'gray'}}>
                {
                    Object.keys(customStatusBarElements || {}).map(key => (
                        <span key={key} style={{paddingLeft: 10}}>
                            {(customStatusBarElements || {})[key]}
                        </span>
                    ))
                }
            </span>
        </div>
    )
}

export default StatusBar