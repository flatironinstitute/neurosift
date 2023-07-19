import { FunctionComponent, useReducer } from "react";
import { SetupTimeseriesSelection } from "../../package/context-timeseries-selection";
import { defaultUnitSelection, UnitSelectionContext, unitSelectionReducer } from "../../package/context-unit-selection";
import TabWidget from "../../TabWidget/TabWidget";
import NeurodataItemsView from "./NeurodataItemView/NeurodataItemsView";
import NeurodataItemView from "./NeurodataItemView/NeurodataItemView";
import NeurosiftItemView from "./NeurosiftItemView/NeurosiftItemView";
import NwbMainView from "./NwbMainView/NwbMainView";
import { useNwbOpenTabs } from "./NwbOpenTabsContext";
import TimeseriesAlignmentView from "./TimeseriesAlignmentView/TimeseriesAlignmentView";

const NwbTabWidget: FunctionComponent<{width: number, height: number}> = ({width, height}) => {
    const {openTabs, currentTabName, setCurrentTab, closeTab} = useNwbOpenTabs()
    return (
        <TabWidget
            width={width}
            height={height}
            tabs={
                openTabs.map(({tabName}) => ({
                    id: tabName,
                    label: labelFromTabName(tabName),
                    title: titleFromTabName(tabName),
                    closeable: tabName === 'main' ? false : true,
                    icon: iconFromTabName(tabName)
                }))
            }
            currentTabId={currentTabName}
            setCurrentTabId={setCurrentTab}
            onCloseTab={fileName => closeTab(fileName)}
        >
            {openTabs.map(({tabName}) => (
                <TabChild key={tabName} tabName={tabName} width={0} height={0} />
            ))}
        </TabWidget>
    )
}

const TabChild: FunctionComponent<{tabName: string, width: number, height: number}> = ({tabName, width, height}) => {
    const [unitSelection, unitSelectionDispatch] = useReducer(unitSelectionReducer, defaultUnitSelection)
    return (
        <SetupTimeseriesSelection>
            <UnitSelectionContext.Provider value={{unitSelection, unitSelectionDispatch}}>
                {
                    tabName === 'main' ? (
                        <NwbMainView key={tabName} width={width} height={height} />
                    ) : tabName.startsWith('neurodata-item:') ? (
                        (() => {
                            const a = tabName.slice(`neurodata-item:`.length).split('|')
                            const path = a[0]
                            const neurodataType = a[1]
                            return <NeurodataItemView key={tabName} width={width} height={height} path={path} neurodataType={neurodataType} />
                        })()
                    ) : tabName.startsWith('neurodata-items:') ? (
                        (() => {
                            const a = tabName.slice(`neurodata-items:`.length).split('@')
                            const items = a.map(s => {
                                const b = s.split('|')
                                return {
                                    path: b[0],
                                    neurodataType: b[1]
                                }
                            })
                            return <NeurodataItemsView key={tabName} width={width} height={height} items={items} />
                        })()
                    ) : tabName === 'timeseries-alignment' ? (
                        <TimeseriesAlignmentView key={tabName} width={width} height={height} />
                    ) : tabName.startsWith('ns:') ? (
                        (() => {
                            const url = tabName.slice(`ns:`.length)
                            return <NeurosiftItemView key={tabName} width={width} height={height} url={url} />
                        })()
                    ) : (
                        <div key={tabName}>Not implemented</div>
                    )
                }
            </UnitSelectionContext.Provider>
        </SetupTimeseriesSelection>
    )
}

const labelFromTabName = (tabName: string) => {
    if (tabName === 'main') {
        return 'main'
    }
    else if (tabName.startsWith('neurodata-item:')) {
        return `${tabName.slice(`neurodata-item:`.length).split('|')[0].split('/').slice(-1)[0]}`
    }
    else if (tabName.startsWith('neurodata-items:')) {
        return `${tabName.slice(`neurodata-items:`.length).split('@').length} items`
    }
    else if (tabName === 'timeseries-alignment') {
        return 'timeseries alignment'
    }
    else if (tabName.startsWith('ns:')) {
        return `${tabName.slice(`ns:`.length).split('/').slice(-1)[0]}`
    }
    return tabName
}

const titleFromTabName = (tabName: string) => {
    if (tabName === 'main') {
        return 'main view'
    }
    return tabName
}

const iconFromTabName = (tabName: string) => {
    return undefined
}

export default NwbTabWidget