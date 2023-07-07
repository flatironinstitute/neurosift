/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createContext, useCallback, useContext, useMemo, useReducer } from "react"

type NwbItem = {
    path: string
    neurodataType: string
}

type SelectedNwbItemsState = {
    selectedNwbItems: NwbItem[]
}

type SelectedNwbItemsAction = {
    type: 'toggle'
    path: string
    neurodataType?: string
}

export const selectedNwbItemsReducer = (state: SelectedNwbItemsState, action: SelectedNwbItemsAction): SelectedNwbItemsState => {
    if (action.type === 'toggle') {
        const { path, neurodataType } = action
        const item = state.selectedNwbItems.find(item => item.path === path)
        if (item) {
            return {
                selectedNwbItems: state.selectedNwbItems.filter(item => item.path !== path)
            }
        } else {
            return {
                selectedNwbItems: [
                    ...state.selectedNwbItems,
                    { path, neurodataType: neurodataType || '' }
                ]
            }
        }
    }
    return state
}

type SelectedNwbItemsContextType = {
    selectedNwbItemsState: SelectedNwbItemsState
    selectedNwbItemsDispatch: (action: SelectedNwbItemsAction) => void
}

export const SelectedNwbItemsContext = createContext<SelectedNwbItemsContextType | undefined>(undefined)

export const useSelectedNwbItems = () => {
    const {selectedNwbItemsState, selectedNwbItemsDispatch} = useContext(SelectedNwbItemsContext)!
    const selectedNwbItemPaths = useMemo(() => selectedNwbItemsState.selectedNwbItems.map(item => item.path), [selectedNwbItemsState.selectedNwbItems])
    const toggleSelectedNwbItem = useCallback((path: string, neurodataType?: string) => {
        selectedNwbItemsDispatch({ type: 'toggle', path, neurodataType })
    }, [selectedNwbItemsDispatch])
    return {
        selectedNwbItems: selectedNwbItemsState.selectedNwbItems,
        selectedNwbItemPaths,
        toggleSelectedNwbItem
    }
}