import React, { FunctionComponent, PropsWithChildren, useEffect } from 'react';

type NwbOpenTabsState = {
    openTabs: {
        tabName: string
    }[]
    currentTabName?: string
}

type NwbOpenTabsAction = {
    type: 'openTab'
    tabName: string
} | {
    type: 'closeTab'
    tabName: string
} | {
    type: 'closeAllTabs'
} | {
    type: 'setCurrentTab'
    tabName: string
}

const nwbOpenTabsReducer = (state: NwbOpenTabsState, action: NwbOpenTabsAction) => {
    switch (action.type) {
        case 'openTab':
            if (state.openTabs.find(x => x.tabName === action.tabName)) {
                return {
                    ...state,
                    currentTabName: action.tabName
                }
            }
            return {
                ...state,
                openTabs: [...state.openTabs, {tabName: action.tabName}],
                currentTabName: action.tabName
            }
        case 'closeTab':
            if (!state.openTabs.find(x => x.tabName === action.tabName)) {
                return state
            }
            return {
                ...state,
                openTabs: state.openTabs.filter(x => x.tabName !== action.tabName),
                currentTabName: state.currentTabName === action.tabName ? state.openTabs[0]?.tabName : state.currentTabName
            }
        case 'closeAllTabs':
            return {
                ...state,
                openTabs: [],
                currentTabName: undefined
            }
        case 'setCurrentTab':
            if (!state.openTabs.find(x => x.tabName === action.tabName)) {
                return state
            }
            return {
                ...state,
                currentTabName: action.tabName
            }
    }
}

type NwbOpenTabsContextType = {
    openTabs: {
        tabName: string
    }[]
    currentTabName?: string
    openTab: (tabName: string) => void
    closeTab: (tabName: string) => void
    closeAllTabs: () => void
    setCurrentTab: (tabName: string) => void
}

const NwbOpenTabsContext = React.createContext<NwbOpenTabsContextType>({
    openTabs: [],
    currentTabName: undefined,
    openTab: () => {},
    closeTab: () => {},
    closeAllTabs: () => {},
    setCurrentTab: () => {}
})

type Props = {
    // none
}

const defaultNwbOpenTabsState: NwbOpenTabsState = {
    // openTabs: [{tabName: 'main'}, {tabName: `acquisition:position_sensor1`}],
    // currentTabName: 'acquisition:position_sensor1'
    openTabs: [{tabName: 'main'}],
    currentTabName: 'main'
}

export const SetupNwbOpenTabs: FunctionComponent<PropsWithChildren<Props>> = ({children}) => {
    const [openTabs, openTabsDispatch] = React.useReducer(nwbOpenTabsReducer, defaultNwbOpenTabsState)

    const value: NwbOpenTabsContextType = React.useMemo(() => ({
        openTabs: openTabs.openTabs,
        currentTabName: openTabs.currentTabName,
        openTab: (tabName: string) => openTabsDispatch({type: 'openTab', tabName}),
        closeTab: (tabName: string) => openTabsDispatch({type: 'closeTab', tabName}),
        closeAllTabs: () => openTabsDispatch({type: 'closeAllTabs'}),
        setCurrentTab: (tabName: string) => openTabsDispatch({type: 'setCurrentTab', tabName}),
    }), [openTabs])

    return (
        <NwbOpenTabsContext.Provider value={value}>
            {children}
        </NwbOpenTabsContext.Provider>
    )
}

export const useNwbOpenTabs = () => {
    const context = React.useContext(NwbOpenTabsContext)
    return context
}