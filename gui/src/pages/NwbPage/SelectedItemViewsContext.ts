/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { createContext, useCallback, useContext } from "react"

type SelectedItemViewsState = {
    selectedItemViews: string[]
}

type SelectedItemViewsAction = {
    type: 'toggle'
    itemView: string
}

export const selectedItemViewsReducer = (state: SelectedItemViewsState, action: SelectedItemViewsAction): SelectedItemViewsState => {
    switch (action.type) {
        case 'toggle':
            if (state.selectedItemViews.includes(action.itemView)) {
                return {
                    selectedItemViews: state.selectedItemViews.filter(x => (x !== action.itemView))
                }
            }
            else {
                return {
                    selectedItemViews: [...state.selectedItemViews, action.itemView]
                }
            }
        default:
            throw Error('Unexpected action type in selectedItemViewsReducer')
    }
}

type SelectedItemViewsContextType = {
    selectedItemViewsState: SelectedItemViewsState
    selectedItemViewsDispatch: (action: SelectedItemViewsAction) => void
}

export const SelectedItemViewsContext = createContext<SelectedItemViewsContextType | undefined>(undefined)

export const useSelectedItemViews = () => {
    const {selectedItemViewsState, selectedItemViewsDispatch} = useContext(SelectedItemViewsContext)!
    const toggleSelectedItemView = useCallback((itemView: string) => {
        selectedItemViewsDispatch({type: 'toggle', itemView})
    }, [selectedItemViewsDispatch])
    return {
        selectedItemViews: selectedItemViewsState.selectedItemViews,
        toggleSelectedItemView
    }
}