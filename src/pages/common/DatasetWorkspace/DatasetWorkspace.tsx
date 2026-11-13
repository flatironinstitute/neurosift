import ErrorBoundary from "@components/ErrorBoundary";
import ScrollY from "@components/ScrollY";
import { BaseTabAction } from "@components/tabs/tabsReducer";
import { EmptyState, LoadingState, TabPanel, Tabs, type TabItem } from "@ui";
import "./DatasetWorkspace.css";
import {
  FunctionComponent,
  Suspense,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { initializePlugins } from "./plugins/init";
import { DatasetFile } from "./plugins/pluginInterface";
import { findPluginsByFile } from "./plugins/registry";
import {
  datasetWorkspaceTabsReducer,
  type FileTab,
} from "./datasetWorkspaceTabsReducer";
import DatasetMainTab from "./DatasetMainTab";
import { LOCATION_PARAM, findFolder, locationSearch } from "./folderLocation";
import useCopyText from "./plugins/useCopyText";
import TabToolbar, { TOOLBAR_HEIGHT } from "./TabToolbar";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { ShareSettingsProvider } from "@shared/shareLink/ShareSettingsProvider";
import { pageSearch } from "@shared/shareLink/linkSettings";
import { ShareAddress } from "@shared/shareLink/shareAddress";
import { ShareAddressContext } from "@shared/shareLink/shareSettingsContext";

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
  /** One folder by path, null if it isn't there; without it, folders are found from the top level down. */
  fetchFolder?: (path: string) => Promise<DatasetFile[] | null>;
  specialOpenFileHandler?: (file: DatasetFile) => boolean;
  mainTabAdditionalControls?: JSX.Element;
}

const linkTab = (file: DatasetFile) => `${file.filepath}|${file.parentId}`;

const DatasetWorkspace: FunctionComponent<DatasetWorkspaceProps> = ({
  width,
  height,
  topLevelFiles,
  initialTab,
  loadFileFromPath,
  fetchDirectory,
  fetchFolder,
  specialOpenFileHandler,
  mainTabAdditionalControls,
}) => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const copy = useCopyText();
  const location = new URLSearchParams(search).get(LOCATION_PARAM);
  const hrefFor = (path: string) => locationSearch(pageSearch(search), path);

  const loadFolder = useMemo(() => {
    if (fetchFolder) return fetchFolder;
    // Each folder is fetched once, so moving back up is instant.
    const cache = new Map<DatasetFile, Promise<DatasetFile[]>>();
    const fetchOnce = (folder: DatasetFile) => {
      if (!cache.has(folder))
        cache.set(
          folder,
          fetchDirectory(folder).catch((error) => {
            cache.delete(folder);
            throw error;
          }),
        );
      return cache.get(folder)!;
    };
    return (path: string) => findFolder(path, topLevelFiles, fetchOnce);
  }, [fetchFolder, fetchDirectory, topLevelFiles]);
  const [tabsState, dispatch] = useReducer(datasetWorkspaceTabsReducer, {
    tabs: [],
    activeTabId: "main",
  });

  // The address follows the open file and its settings; Main drops the tab
  // once a linked file has opened, so a slow restore isn't lost.
  const [address] = useState(() => new ShareAddress());
  const shownFile = useRef(!initialTab);
  const activeFile = tabsState.tabs.find(
    (t) => t.id === tabsState.activeTabId && t.type === "file",
  );
  const activeLink =
    activeFile?.type === "file" ? linkTab(activeFile.file) : null;
  useEffect(() => {
    if (activeLink) shownFile.current = true;
    if (shownFile.current) address.activate(activeLink);
  }, [address, activeLink]);

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
    <ShareAddressContext.Provider value={address}>
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
                location={location}
                loadFolder={loadFolder}
                hrefFor={hrefFor}
                onNavigate={(href) => navigate({ search: href })}
                onCopyLink={(path) =>
                  copy(
                    new URL(hrefFor(path), window.location.href).href,
                    "Link copied",
                  )
                }
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
                <ShareSettingsProvider
                  tab={linkTab(tab.file)}
                  opensAs={
                    initialTab?.split("|")[0] === tab.file.filepath
                      ? initialTab
                      : linkTab(tab.file)
                  }
                >
                  <TabToolbar file={tab.file} />
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
                                window.open(
                                  tab.file.urls[0],
                                  "_blank",
                                  "noopener",
                                ),
                            }
                          : undefined
                      }
                    >
                      {`${tab.file.filename} can be downloaded to open it elsewhere.`}
                    </EmptyState>
                  )}
                </ShareSettingsProvider>
              </TabPanel>
            );
          })}
        </div>
      </div>
    </ShareAddressContext.Provider>
  );
};

export default DatasetWorkspace;
