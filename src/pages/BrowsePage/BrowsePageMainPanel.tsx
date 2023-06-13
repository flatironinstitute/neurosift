import { FunctionComponent } from "react";
import TabWidget from "../../TabWidget/TabWidget";
import { FileIcon } from "./FileBrowser/FileBrowser";
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