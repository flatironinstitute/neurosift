import { FunctionComponent } from "react";
import TabWidget from "../../TabWidget/TabWidget";
import EditNSFigView from "./EditNSFigView/EditNSFigView";
import { FileIcon } from "./FileBrowser/FileBrowser";
import CustomFigureView from "./FileView/CustomFigureView";
import FileView from "./FileView/FileView";
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
                tabName.startsWith('file:') ? (
                    <FileView key={tabName} width={0} height={0} filePath={tabName.slice('file:'.length)} />
                ) : tabName.startsWith('edit:') && (tabName.endsWith('.ns-fig')) ? (
                    <EditNSFigView key={tabName} width={0} height={0} filePath={tabName.slice('edit:'.length)} />
                ) : tabName.startsWith('figure:') ? (
                    <CustomFigureView key={tabName} width={0} height={0} fileNames={JSON.parse(tabName.slice('figure:'.length))} />
                ) : (
                    <div key={tabName}>Not implemented</div>
                )
            ))}
        </TabWidget>
    )
}

const labelFromTabName = (tabName: string) => {
    if (tabName.startsWith('file:')) {
        return tabName.slice('file:'.length).split('/').pop() || ''
    }
    else if (tabName.startsWith('figure:')) {
        const fileNames = JSON.parse(tabName.slice('figure:'.length))
        return `Figure (${fileNames.length})`
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