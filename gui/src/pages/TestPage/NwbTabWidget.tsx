import { Square } from "@mui/icons-material";
import { FunctionComponent, useReducer } from "react";
import { SetupTimeseriesSelection } from "../../package/context-timeseries-selection";
import { defaultUnitSelection, UnitSelectionContext, unitSelectionReducer } from "../../package/context-unit-selection";
import TabWidget from "../../TabWidget/TabWidget";
import NwbAcquisitionItemView from "./NwbAcquisitionItemView/NwbAcquisitionItemView";
import NwbMainView from "./NwbMainView";
import { useNwbOpenTabs } from "./NwbOpenTabsContext";

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
                    ) : tabName.startsWith('acquisition') ? (
                        <NwbAcquisitionItemView key={tabName} width={width} height={height} itemName={tabName.slice(`acquisition:`.length)} />
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
    return tabName
}

const titleFromTabName = (tabName: string) => {
    if (tabName === 'main') {
        return 'main view'
    }
    return tabName
}

const iconFromTabName = (tabName: string) => {
    if (tabName === 'main') {
        return <Square />
    }
    else return undefined
}

export default NwbTabWidget