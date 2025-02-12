import ScrollY from "@components/ScrollY";
import { TAB_BAR_HEIGHT, TabBar } from "@components/tabs/TabBar";
import { BaseTabAction } from "@components/tabs/tabsReducer";
import { FunctionComponent, useEffect, useReducer } from "react";
import { initializePlugins } from "./plugins/init";
import { DatasetFile } from "./plugins/pluginInterface";
import { findPluginsByFile } from "./plugins/registry";
import {
  DatasetWorkspaceTab,
  datasetWorkspaceTabsReducer,
} from "./datasetWorkspaceTabsReducer";
import DatasetMainTab from "./DatasetMainTab";
import TabToolbar, { TOOLBAR_HEIGHT } from "./TabToolbar";

// Initialize plugins
initializePlugins();

interface DatasetWorkspaceProps {
  width: number;
  height: number;
  topLevelFiles: DatasetFile[];
  initialTab?: string | null;
  loadFileFromPath: (
    filePath: string,
    parentId: string,
  ) => Promise<DatasetFile | null>;
  fetchDirectory: (file: DatasetFile) => Promise<DatasetFile[]>; // fetches the files in a directory
  specialOpenFileHandler?: (file: DatasetFile) => boolean;
  mainTabAdditionalControls?: JSX.Element;
}

const DatasetWorkspace: FunctionComponent<DatasetWorkspaceProps> = ({
  width,
  height,
  topLevelFiles,
  initialTab,
  loadFileFromPath,
  fetchDirectory,
  specialOpenFileHandler,
  mainTabAdditionalControls,
}) => {
  const [tabsState, dispatch] = useReducer(datasetWorkspaceTabsReducer, {
    tabs: [],
    activeTabId: "main",
  });

  // Handle initial tab opening
  useEffect(() => {
    const loadInitialTab = async () => {
      if (initialTab) {
        const pp = initialTab.split("|");
        const filePath = pp[0];
        const parentId = pp[1];
        const file = await loadFileFromPath(filePath, parentId);
        if (!file) {
          console.error(`Failed to find file for path: ${filePath}`);
          return;
        }
        dispatch({ type: "OPEN_TAB", file });
      }
    };
    loadInitialTab();
  }, [initialTab, loadFileFromPath]);

  const handleOpenFile = (file: DatasetFile) => {
    if (specialOpenFileHandler) {
      if (specialOpenFileHandler(file)) {
        return;
      }
    }
    dispatch({ type: "OPEN_TAB", file });
  };

  const handleCloseTab = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: "CLOSE_TAB", id } as BaseTabAction);
  };

  const handleSwitchTab = (id: string) => {
    dispatch({ type: "SWITCH_TO_TAB", id } as BaseTabAction);
  };

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;
  const toolbarHeight = TOOLBAR_HEIGHT;
  const pluginContentHeight = contentHeight - toolbarHeight;

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
        padding: "0 10px",
      }}
    >
      <TabBar<DatasetWorkspaceTab>
        tabs={tabsState.tabs}
        activeTabId={tabsState.activeTabId}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        width={width}
      />

      <div
        style={{
          position: "absolute",
          left: 10,
          width: width - 20,
          height: contentHeight,
          top: tabBarHeight,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: tabsState.activeTabId === "main" ? "block" : "none",
          }}
        >
          <ScrollY width={width - 20} height={contentHeight}>
            <DatasetMainTab
              topLevelFiles={topLevelFiles}
              onOpenFile={handleOpenFile}
              fetchDirectory={fetchDirectory}
              additionalControls={mainTabAdditionalControls}
            />
          </ScrollY>
        </div>
        {tabsState.tabs.map((tab) => {
          if (tab.type === "file") {
            const plugins = findPluginsByFile(tab.file.filename);
            const Plugin = plugins[0]?.component; // Use the highest priority plugin

            if (Plugin) {
              return (
                <div
                  key={tab.id}
                  style={{
                    display:
                      tabsState.activeTabId === tab.id ? "block" : "none",
                    height: contentHeight,
                  }}
                >
                  <TabToolbar width={width - 20} file={tab.file} />
                  <ScrollY
                    width={width - 20}
                    height={pluginContentHeight}
                    top={toolbarHeight}
                  >
                    {/* The plugin may or may not use the width/height */}
                    <Plugin
                      file={tab.file}
                      width={width - 20}
                      height={pluginContentHeight}
                    />
                  </ScrollY>
                </div>
              );
            }

            return (
              <div
                key={tab.id}
                style={{
                  display: tabsState.activeTabId === tab.id ? "block" : "none",
                  height: contentHeight,
                }}
              >
                <TabToolbar width={width - 20} file={tab.file} />
                <div style={{ padding: "20px" }}>
                  <h3>No viewer available for this file type</h3>
                  <p>Filename: {tab.file.filename}</p>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default DatasetWorkspace;
