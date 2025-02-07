import { FunctionComponent, useEffect, useMemo, useReducer } from "react";
import { TAB_BAR_HEIGHT, TabBar } from "../../../components/tabs/TabBar";
import { BaseTabAction } from "../../../components/tabs/tabsReducer";
import { initializePlugins } from "../plugins/init";
import { OpenNeuroFile } from "../plugins/pluginInterface";
import { findPluginsByFile } from "../plugins/registry";
import { OpenNeuroTab, openNeuroTabsReducer } from "../types";
import OpenNeuroMainTab from "./OpenNeuroMainTab";
import ScrollY from "../../../components/ScrollY";
import TabToolbar, { TOOLBAR_HEIGHT } from "./TabToolbar";

// Initialize plugins
initializePlugins();

interface OpenNeuroDatasetWorkspaceProps {
  width: number;
  height: number;
  datasetId: string;
  snapshotTag: string;
  topLevelFiles: OpenNeuroFile[];
  initialTab?: string | null;
}

interface OpenNeuroFileResponse {
  id: string;
  key: string;
  filename: string;
  directory: boolean;
  size: number;
  urls: string[];
}

const OpenNeuroDatasetWorkspace: FunctionComponent<
  OpenNeuroDatasetWorkspaceProps
> = ({ width, height, datasetId, snapshotTag, topLevelFiles, initialTab }) => {
  const [tabsState, dispatch] = useReducer(openNeuroTabsReducer, {
    tabs: [],
    activeTabId: "main",
  });

  const loadFileFromPath = useMemo(
    () =>
      async (
        filePath: string,
        parentId: string,
      ): Promise<OpenNeuroFile | null> => {
        const query =
          `query snapshot($datasetId: ID!, $tag: String!, $tree: String!) {
      snapshot(datasetId: $datasetId, tag: $tag) {
        files(tree: $tree) {
          id
          key
          filename
          directory
          size
          urls
        }
      }
    }`
            .split("\n")
            .join("\\n");

        try {
          const resp = await fetch("https://openneuro.org/crn/graphql", {
            headers: { "content-type": "application/json" },
            body: `{"operationName":"snapshot","variables":{"datasetId":"${datasetId}","tag":"${snapshotTag}","tree":"${parentId}"},"query":"${query}"}`,
            method: "POST",
          });

          const fileName = filePath.split("/").pop();

          if (!resp.ok) return null;
          const data = await resp.json();
          const files = data.data.snapshot.files;
          const matchingFile = files.find(
            (f: OpenNeuroFileResponse) => f.filename === fileName,
          );

          if (!matchingFile) return null;

          return {
            id: matchingFile.id,
            key: matchingFile.key,
            filepath: filePath,
            parentId,
            filename: matchingFile.filename,
            directory: matchingFile.directory,
            size: matchingFile.size,
            urls: matchingFile.urls,
          };
        } catch (error) {
          console.error("Error loading file:", error);
          return null;
        }
      },
    [datasetId, snapshotTag],
  );

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
                    height: contentHeight,
                  }}
                >
                  <TabToolbar width={width - 20} file={tab.file} />
                  <ScrollY
                    width={width - 20}
                    height={pluginContentHeight}
                    top={toolbarHeight}
                  >
                    <Plugin file={tab.file} />
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

export default OpenNeuroDatasetWorkspace;
