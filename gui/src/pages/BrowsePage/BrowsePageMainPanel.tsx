import { FunctionComponent } from "react";
import { SetupTimeseriesSelection } from "../../package/context-timeseries-selection";
import TabWidget from "../../TabWidget/TabWidget";
import EditNSFigView from "./EditNSFigView/EditNSFigView";
import { FileIcon } from "./FileBrowser/FileBrowser";
import CustomFigureView from "./FileView/CustomFigureView";
import FileView from "./FileView/FileView";
import PynappleObjectsView from "./FileView/PynappleObjectView/PynappleObjectsView";
import PynappleObjectView from "./FileView/PynappleObjectView/PynappleObjectView";
import { useOpenTabs } from "./OpenTabsContext";

const BrowsePageMainPanel: FunctionComponent<{width: number, height: number}> = ({width, height}) => {
    const {openTabs, currentTabName, setCurrentTab, closeTab} = useOpenTabs()
    return (
        <TabWidget
            width={width}
            height={height}
            tabs={
                openTabs.map(({tabName}) => ({
                    id: tabName,
                    label: labelFromTabName(tabName),
                    title: titleFromTabName(tabName),
                    closeable: true,
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
    return (
        <SetupTimeseriesSelection>
            {
                tabName.startsWith('file:') ? (
                    <FileView key={tabName} width={width} height={height} filePath={tabName.slice('file:'.length)} />
                ) : tabName.startsWith('edit:') && (tabName.endsWith('.ns-fig')) ? (
                    <EditNSFigView key={tabName} width={width} height={height} filePath={tabName.slice('edit:'.length)} />
                ) : tabName.startsWith('figure:') ? (
                    <CustomFigureView key={tabName} width={width} height={height} fileNames={JSON.parse(tabName.slice('figure:'.length))} />
                ) : tabName.startsWith('pynapple-object:') ? (                    
                    <PynappleObjectView key={tabName} width={width} height={height} sessionPath={getSessionPathFromPynappleObjectTabName(tabName)} objectName={getObjectNameFromPynappleObjectTabName(tabName)} objectType={getObjectTypeFromPynappleObjectTabName(tabName)} />
                ) : tabName.startsWith('pynapple-objects:') ? (
                    <PynappleObjectsView key={tabName} width={width} height={height} sessionPath={getSessionPathFromPynappleObjectsTabName(tabName)} objects={getObjectsFromObjectsTabName(tabName)} />
                ) : (
                    <div key={tabName}>Not implemented</div>
                )
            }
        </SetupTimeseriesSelection>
    )
}

const getSessionPathFromPynappleObjectTabName = (tabName: string) => {
    return tabName.slice('pynapple-object:'.length).split('|')[0]
}

const getObjectNameFromPynappleObjectTabName = (tabName: string) => {
    return tabName.slice('pynapple-object:'.length).split('|')[1]
}

const getObjectTypeFromPynappleObjectTabName = (tabName: string) => {
    return tabName.slice('pynapple-object:'.length).split('|')[2] as 'TsGroup' | 'TsdFrame' | 'dict'
}

const getSessionPathFromPynappleObjectsTabName = (tabName: string) => {
    return tabName.slice('pynapple-objects:'.length).split('|')[0]
}

const getObjectsFromObjectsTabName = (tabName: string) => {
    const a = tabName.slice('pynapple-objects:'.length).split('|').slice(1)
    return a.map(s => ({
        name: s.split(':')[0],
        type: s.split(':')[1] as 'TsGroup' | 'TsdFrame' | 'dict'
    }))
}

const labelFromTabName = (tabName: string) => {
    if (tabName.startsWith('file:')) {
        return tabName.slice('file:'.length).split('/').pop() || ''
    }
    else if (tabName.startsWith('figure:')) {
        const fileNames = JSON.parse(tabName.slice('figure:'.length))
        return `Figure (${fileNames.length})`
    }
    else if (tabName.startsWith('pynapple-object:')) {
        return 'pyn:' + tabName.split('|')[1]
    }
    else if (tabName.startsWith('pynapple-objects:')) {
        return 'pyn:' + tabName.split('|').slice(1).map(s => s.split(':')[0]).join('|')
    }
    else if (tabName.startsWith('edit:')) {
        return 'edit:' + tabName.slice('edit:'.length).split('/').pop() || ''
    }
    return tabName
}

const titleFromTabName = (tabName: string) => {
    if (tabName.startsWith('file:')) {
        return tabName.slice('file:'.length)
    }
    return tabName
}

const iconFromTabName = (tabName: string) => {
    if (tabName.startsWith('file:')) {
        return <FileIcon fileName={tabName.slice('file:'.length)} isDir={false} />
    }
    else return undefined
}

export default BrowsePageMainPanel