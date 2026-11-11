import ErrorBoundary from "@components/ErrorBoundary";
import ScrollY from "@components/ScrollY";
import { BaseTabAction } from "@components/tabs/tabsReducer";
import { EmptyState, LoadingState, TabPanel, Tabs, type TabItem } from "@ui";
import "./DatasetWorkspace.css";
import {
  FunctionComponent,
  Suspense,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { initializePlugins } from "./plugins/init";
import { DatasetFile } from "./plugins/pluginInterface";
import { findPluginsByFile } from "./plugins/registry";
import {
  datasetWorkspaceTabsReducer,
  type FileTab,
} from "./datasetWorkspaceTabsReducer";
import DatasetMainTab from "./DatasetMainTab";
import TabToolbar, { TOOLBAR_HEIGHT } from "./TabToolbar";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";

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
  const initialTabLoaded = useRef(false);
  useEffect(() => {
    const loadInitialTab = async () => {
      if (initialTab) {
        if (initialTabLoaded.current) return;
        const pp = initialTab.split("|");
        const filePath = pp[0];
        const parentId = pp[1];
        const file = await loadFileFromPath(filePath, parentId);
        if (!file) {
          console.error(`Failed to find file for path: ${filePath}`);
          return;
        }
        initialTabLoaded.current = true;
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

  const handleCloseTab = (id: string) => {
    dispatch({ type: "CLOSE_TAB", id } as BaseTabAction);
  };

  const handleSwitchTab = (id: string) => {
    dispatch({ type: "SWITCH_TO_TAB", id } as BaseTabAction);
  };

  // The object tabs are 36px (layout/tabs-height).
  const contentHeight = height - 36;
  const toolbarHeight = TOOLBAR_HEIGHT;
  const pluginContentHeight = contentHeight - toolbarHeight;
  const contentWidth = width;

  const tabs: TabItem[] = [
    { id: "main", label: "Files" },
    ...tabsState.tabs
      .filter((tab): tab is FileTab => tab.type === "file")
      .map((tab) => ({
        id: tab.id,
        label: tab.label,
        closable: true,
        tooltip: tab.file.filepath,
      })),
  ];

  return (
    <div className="dataset-workspace">
      <Tabs
        id="dataset-tabs"
        kind="object"
        label="Open files"
        tabs={tabs}
        selected={tabsState.activeTabId}
        onSelect={handleSwitchTab}
        onClose={handleCloseTab}
      />
      <div className="dataset-workspace-content">
        <TabPanel
          tabsId="dataset-tabs"
          tabId="main"
          selected={tabsState.activeTabId === "main"}
        >
          <ScrollY width={contentWidth} height={contentHeight}>
            <DatasetMainTab
              topLevelFiles={topLevelFiles}
              onOpenFile={handleOpenFile}
              fetchDirectory={fetchDirectory}
              additionalControls={mainTabAdditionalControls}
            />
          </ScrollY>
        </TabPanel>
        {tabsState.tabs.map((tab) => {
          if (tab.type !== "file") return null;
          const plugins = findPluginsByFile(tab.file.filename);
          const pluginHeight =
            plugins.length > 1
              ? Math.min(600, (pluginContentHeight * 2) / 3)
              : pluginContentHeight;
          return (
            <TabPanel
              key={tab.id}
              tabsId="dataset-tabs"
              tabId={tab.id}
              selected={tabsState.activeTabId === tab.id}
            >
              <TabToolbar width={contentWidth} file={tab.file} />
              {plugins.length > 0 ? (
                <ScrollY
                  width={contentWidth}
                  height={contentHeight - toolbarHeight}
                  top={toolbarHeight}
                >
                  <ProvideTimeseriesSelection>
                    <div className="dataset-workspace-views">
                      {plugins.map((plugin, index) => (
                        <div key={index}>
                          <ErrorBoundary
                            what={`the ${plugin.name} view of ${tab.file.filepath}`}
                          >
                            <Suspense
                              fallback={
                                <LoadingState
                                  label={`Loading the ${plugin.name} view`}
                                  phase="loading"
                                />
                              }
                            >
                              <plugin.component
                                file={tab.file}
                                width={contentWidth}
                                height={pluginHeight}
                              />
                            </Suspense>
                          </ErrorBoundary>
                        </div>
                      ))}
                    </div>
                  </ProvideTimeseriesSelection>
                </ScrollY>
              ) : (
                <EmptyState
                  title={`Neurosift can’t show ${tab.file.filename.split(".").pop()} files yet`}
                  action={
                    tab.file.urls[0]
                      ? {
                          label: "Download the file",
                          onClick: () =>
                            window.open(tab.file.urls[0], "_blank", "noopener"),
                        }
                      : undefined
                  }
                >
                  {`${tab.file.filename} can be downloaded to open it elsewhere.`}
                </EmptyState>
              )}
            </TabPanel>
          );
        })}
      </div>
    </div>
  );
};

export default DatasetWorkspace;
