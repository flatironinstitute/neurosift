import { FunctionComponent, useReducer } from "react";
import { TAB_BAR_HEIGHT, TabBar } from "../../../components/tabs/TabBar";
import { BaseTabAction } from "../../../components/tabs/tabsReducer";
import { initializePlugins } from "../plugins/init";
import { OpenNeuroFile } from "../plugins/pluginInterface";
import { findPluginsByFile } from "../plugins/registry";
import { OpenNeuroTab, openNeuroTabsReducer } from "../types";
import OpenNeuroMainTab from "./OpenNeuroMainTab";
import ScrollY from "../../../components/ScrollY";

// Initialize plugins
initializePlugins();

interface OpenNeuroDatasetWorkspaceProps {
  width: number;
  height: number;
  datasetId: string;
  snapshotTag: string;
  topLevelFiles: OpenNeuroFile[];
}

const OpenNeuroDatasetWorkspace: FunctionComponent<
  OpenNeuroDatasetWorkspaceProps
> = ({ width, height, datasetId, snapshotTag, topLevelFiles }) => {
  const [tabsState, dispatch] = useReducer(openNeuroTabsReducer, {
    tabs: [],
    activeTabId: "main",
  });

  const handleOpenFile = (file: OpenNeuroFile) => {
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
      <TabBar<OpenNeuroTab>
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
            <OpenNeuroMainTab
              datasetId={datasetId}
              snapshotTag={snapshotTag}
              topLevelFiles={topLevelFiles}
              onOpenFile={handleOpenFile}
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
                  }}
                >
                  <Plugin file={tab.file} />;
                </div>
              );
            }

            return (
              <div
                key={tab.id}
                style={{
                  display: tabsState.activeTabId === tab.id ? "block" : "none",
                }}
              >
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
      {/* <div
        style={{
          position: "absolute",
          left: 10,
          width: width - 20,
          height: contentHeight,
          top: tabBarHeight,
          overflow: "hidden",
        }}
      >
        <TabContent<OpenNeuroTab>
          tabs={tabsState.tabs}
          activeTabId={tabsState.activeTabId}
          width={contentWidth}
          height={contentHeight}
          renderMainTab={() => (
            <OpenNeuroMainTab files={files} onOpenFile={handleOpenFile} />
          )}
          renderTabContent={(tab) => {
            if (tab.type === "file") {
              const plugins = findPluginsByFile(tab.file.filename);
              const Plugin = plugins[0]?.component; // Use the highest priority plugin

              if (Plugin) {
                return <Plugin file={tab.file} />;
              }

              return (
                <div style={{ padding: "20px" }}>
                  <h3>No viewer available for this file type</h3>
                  <p>Filename: {tab.file.filename}</p>
                </div>
              );
            }
            return null;
          }}
        />
      </div> */}
    </div>
  );
};

export default OpenNeuroDatasetWorkspace;
