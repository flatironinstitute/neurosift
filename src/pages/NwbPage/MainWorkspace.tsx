import React, { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { TabPanel, Tabs, type TabItem } from "@ui";
import "./FileViewer.css";
import { useTabManager } from "./TabManager";
import SingleTabView from "./components/SingleTabView";
import MultiTabView from "./components/MultiTabView";
import AuthErrorNotification from "./components/AuthErrorNotification";
import { DynamicTab } from "./Types/index";
import { getHdf5Group, hasAuthError, isDandiAssetUrl } from "./hdf5Interface";
import { SetupNwbFileSpecificationsProvider } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import { neurodataTypeInheritsFrom } from "./neurodataTypeInheritance";
import ErrorBoundary from "@components/ErrorBoundary";
import ScrollY from "@components/ScrollY";
import NwbHierarchyView from "./NwbHierarchyView";
import Hdf5View from "./Hdf5View/Hdf5View";
import TimeseriesAlignmentView from "./TimeseriesAlignmentView";
import NwbUsageScript from "./components/NwbUsageScript";
import MultiVideoTabView from "./MultiVideoTabView";
import IcephysTabView from "./IcephysTabView";
import { hasExternalVideos } from "./externalVideoUtils";
import { useSyncTabToUrl } from "./useSyncTabToUrl";
import { LoadingState } from "@ui";

const SpecificationsView = lazy(
  () => import("./SpecificationsView/SpecificationsView"),
);

// All possible fixed tabs. "video-widget" and "icephys" are data-dependent and
// only shown when the file actually contains the corresponding data (see below),
// so they do not appear as dead buttons.
const ALL_FIXED_TABS: TabItem[] = [
  { id: "widgets", label: "Widgets" },
  { id: "video-widget", label: "Videos" },
  { id: "icephys", label: "Icephys" },
  { id: "timeseries-alignment", label: "Timeseries alignment" },
  { id: "python-usage", label: "Python usage" },
  { id: "specifications", label: "Schema", end: true },
  { id: "hdf5", label: "HDF5", end: true },
];

// The section bar and object tabs, 44px and 36px (layout/sectionbar-height, layout/tabs-height).
const SECTION_BAR_HEIGHT = 44;
const OBJECT_TABS_HEIGHT = 36;

const FIXED_TAB_IDS = new Set(ALL_FIXED_TABS.map((t) => t.id));

interface MainWorkspaceProps {
  nwbUrl: string;
  width: number;
  height: number;
  initialTabId?: string;
}

const MainWorkspace: React.FC<MainWorkspaceProps> = ({
  width,
  height,
  nwbUrl,
  initialTabId,
}) => {
  // If initialTabId matches a fixed tab, use it for fixed tab state only
  const isFixedTabInitial = initialTabId && FIXED_TAB_IDS.has(initialTabId);
  const {
    tabsState,
    handleOpenObjectsInNewTab,
    handleOpenObjectInNewTab,
    handleCloseTab,
    handleSwitchTab,
  } = useTabManager({
    nwbUrl,
    initialTabId: isFixedTabInitial ? undefined : initialTabId,
  });

  const [showAuthError, setShowAuthError] = useState(false);
  const [defaultUnitsPath, setDefaultUnitsPath] = useState<
    string | undefined
  >();
  const [activeFixedTab, setActiveFixedTab] = useState(
    isFixedTabInitial ? initialTabId : "widgets",
  );
  // Presence of data-dependent tabs (undefined = still checking). The tabs are
  // shown only once confirmed present, so there is no flash of a dead button.
  const [hasVideos, setHasVideos] = useState<boolean | undefined>(undefined);
  const [hasIcephys, setHasIcephys] = useState<boolean | undefined>(undefined);

  // Detect whether the file has external videos / intracellular ephys, to decide
  // whether to show those tabs at all.
  useEffect(() => {
    let cancelled = false;
    setHasVideos(undefined);
    setHasIcephys(undefined);
    (async () => {
      const found = await hasExternalVideos(nwbUrl);
      if (!cancelled) setHasVideos(found);
    })();
    (async () => {
      const irt = await getHdf5Group(
        nwbUrl,
        "/general/intracellular_ephys/intracellular_recordings",
      );
      if (!cancelled) setHasIcephys(irt !== undefined);
    })();
    return () => {
      cancelled = true;
    };
  }, [nwbUrl]);

  const fixedTabs = useMemo(
    () =>
      ALL_FIXED_TABS.filter((t) => {
        if (t.id === "video-widget") return hasVideos === true;
        if (t.id === "icephys") return hasIcephys === true;
        return true;
      }),
    [hasVideos, hasIcephys],
  );

  // If the active fixed tab turned out to be a data-dependent one the file does
  // not have (e.g. a ?tab=video-widget link to a file with no videos), fall back
  // to the Widgets tab.
  useEffect(() => {
    if (activeFixedTab === "video-widget" && hasVideos === false) {
      setActiveFixedTab("widgets");
    }
    if (activeFixedTab === "icephys" && hasIcephys === false) {
      setActiveFixedTab("widgets");
    }
  }, [activeFixedTab, hasVideos, hasIcephys]);

  const hasDynamicTabs = tabsState.tabs.length > 0;
  const tabBarHeight =
    SECTION_BAR_HEIGHT + (hasDynamicTabs ? OBJECT_TABS_HEIGHT : 0);
  const contentHeight = height - tabBarHeight;
  const contentWidth = width - 32;

  // Determine what content to show:
  // If activeTabId matches a dynamic tab, show that; otherwise show the active fixed section
  const isDynamicTabActive = tabsState.tabs.some(
    (t: DynamicTab) => t.id === tabsState.activeTabId,
  );
  const showFixedContent = !isDynamicTabActive;

  // Check if /units exists
  useEffect(() => {
    setDefaultUnitsPath(undefined);
    let canceled = false;
    const checkUnits = async () => {
      const group = await getHdf5Group(nwbUrl, "/units");
      if (canceled) return;
      // No specifications available here (the provider is set up below this
      // component), so this falls back to the known core type relationships
      if (
        group &&
        neurodataTypeInheritsFrom(group.attrs.neurodata_type, "Units")
      ) {
        setDefaultUnitsPath("/units");
      }
    };
    checkUnits().catch((err) => {
      if (!canceled) console.error(err);
    });
    return () => {
      canceled = true;
    };
  }, [nwbUrl]);

  // Check for authentication errors
  useEffect(() => {
    if (nwbUrl) {
      const checkAuthError = () => {
        const hasError = hasAuthError(nwbUrl);
        setShowAuthError(hasError);
      };
      checkAuthError();
      const intervalId = setInterval(checkAuthError, 1000);
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [nwbUrl]);

  // Debug logs
  useEffect(() => {
    if (isDandiAssetUrl(nwbUrl)) {
      console.log("MainWorkspace - DANDI URL detected:", nwbUrl);
      console.log("MainWorkspace - Current auth errors:", hasAuthError(nwbUrl));
    }
  }, [nwbUrl, showAuthError]);

  // Sync the active tab to the ?tab= URL parameter
  const effectiveActiveTab = isDynamicTabActive
    ? tabsState.activeTabId
    : activeFixedTab;

  // A dynamic tab named by the URL is opened asynchronously (its object type
  // has to be looked up first), and until it is open the active tab is still
  // Widgets. Writing that out would delete the link's own ?tab= before the
  // restore has read it -- and, since the restore re-runs on every change to
  // that parameter, would cancel the lookup it is waiting on. So hold back
  // only that write; switching to any other tab is a deliberate move away
  // from the link's tab and still syncs.
  const initialDynamicTabPending =
    !!initialTabId &&
    !isFixedTabInitial &&
    !tabsState.tabs.some((t: DynamicTab) => t.id === initialTabId);

  useSyncTabToUrl(effectiveActiveTab, {
    enabled: !(initialDynamicTabPending && effectiveActiveTab === "widgets"),
  });

  const handleFixedTabSwitch = (id: string) => {
    setActiveFixedTab(id);
    // Switch the reducer to a non-dynamic-tab id so the dynamic tab row deselects
    handleSwitchTab(id);
  };

  // A path picked in the schema opens in the HDF5 tab.
  const [hdf5Focus, setHdf5Focus] = useState<{ path: string; at: number }>();
  const openInHdf5 = (path: string) => {
    setHdf5Focus({ path, at: Date.now() });
    handleFixedTabSwitch("hdf5");
  };

  const handleDynamicTabSwitch = (id: string) => {
    if (id === "main") {
      // Switch back to showing the active fixed section
      handleSwitchTab(activeFixedTab);
    } else {
      handleSwitchTab(id);
    }
  };

  const objectTabs: TabItem[] = [
    { id: "main", label: "Main" },
    ...tabsState.tabs.map((tab: DynamicTab) => ({
      id: tab.id,
      label: tab.label,
      closable: true,
      tooltip:
        tab.type === "single"
          ? tab.path
          : tab.type === "multi"
            ? tab.paths.join(", ")
            : undefined,
    })),
  ];

  return (
    <div className="file-workspace">
      {showAuthError && isDandiAssetUrl(nwbUrl) && (
        <div className="file-workspace-notice">
          <AuthErrorNotification dandiUrl={nwbUrl} />
        </div>
      )}
      <div className="file-workspace-sections">
        <Tabs
          id="file-sections"
          label="File views"
          tabs={fixedTabs}
          selected={activeFixedTab}
          onSelect={handleFixedTabSwitch}
        />
      </div>
      {hasDynamicTabs && (
        <div className="file-workspace-objects">
          <Tabs
            id="file-objects"
            kind="object"
            label="Open objects"
            tabs={objectTabs}
            selected={isDynamicTabActive ? tabsState.activeTabId : "main"}
            onSelect={handleDynamicTabSwitch}
            onClose={(id) => handleCloseTab(id)}
          />
        </div>
      )}
      <div className="file-workspace-content">
        <SetupNwbFileSpecificationsProvider nwbUrl={nwbUrl}>
          <TabPanel
            tabsId="file-objects"
            tabId="main"
            selected={showFixedContent}
          >
            <TabPanel
              tabsId="file-sections"
              tabId="widgets"
              selected={activeFixedTab === "widgets"}
            >
              <ScrollY width={contentWidth} height={contentHeight}>
                <ErrorBoundary what="the widgets">
                  <NwbHierarchyView
                    nwbUrl={nwbUrl}
                    onOpenObjectInNewTab={handleOpenObjectInNewTab}
                    onOpenObjectsInNewTab={handleOpenObjectsInNewTab}
                    isExpanded={
                      showFixedContent && activeFixedTab === "widgets"
                    }
                    defaultUnitsPath={defaultUnitsPath}
                    onSetDefaultUnitsPath={setDefaultUnitsPath}
                  />
                </ErrorBoundary>
              </ScrollY>
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="hdf5"
              selected={activeFixedTab === "hdf5"}
            >
              <ErrorBoundary what="the HDF5 view">
                <Hdf5View
                  nwbUrl={nwbUrl}
                  width={contentWidth}
                  isExpanded={showFixedContent && activeFixedTab === "hdf5"}
                  focus={hdf5Focus}
                />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="video-widget"
              selected={activeFixedTab === "video-widget"}
            >
              <ScrollY width={contentWidth} height={contentHeight}>
                <ErrorBoundary what="the videos">
                  <MultiVideoTabView
                    nwbUrl={nwbUrl}
                    width={contentWidth}
                    height={contentHeight}
                    isExpanded={
                      showFixedContent && activeFixedTab === "video-widget"
                    }
                  />
                </ErrorBoundary>
              </ScrollY>
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="icephys"
              selected={activeFixedTab === "icephys"}
            >
              <ErrorBoundary what="the icephys view">
                <IcephysTabView
                  nwbUrl={nwbUrl}
                  width={contentWidth}
                  height={contentHeight}
                  isExpanded={showFixedContent && activeFixedTab === "icephys"}
                />
              </ErrorBoundary>
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="timeseries-alignment"
              selected={activeFixedTab === "timeseries-alignment"}
            >
              <ScrollY width={contentWidth} height={contentHeight}>
                <ErrorBoundary what="the timeseries alignment">
                  <TimeseriesAlignmentView
                    nwbUrl={nwbUrl}
                    width={contentWidth}
                    isExpanded={
                      showFixedContent &&
                      activeFixedTab === "timeseries-alignment"
                    }
                    onOpenTimeseriesItem={(path) => {
                      handleOpenObjectInNewTab(path);
                    }}
                  />
                </ErrorBoundary>
              </ScrollY>
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="specifications"
              selected={activeFixedTab === "specifications"}
            >
              {showFixedContent && activeFixedTab === "specifications" && (
                <ErrorBoundary what="the schema">
                  <Suspense
                    fallback={
                      <LoadingState
                        label="Loading the schema"
                        phase="loading"
                      />
                    }
                  >
                    <SpecificationsView
                      nwbUrl={nwbUrl}
                      onOpenPath={openInHdf5}
                    />
                  </Suspense>
                </ErrorBoundary>
              )}
            </TabPanel>
            <TabPanel
              tabsId="file-sections"
              tabId="python-usage"
              selected={activeFixedTab === "python-usage"}
            >
              <ScrollY width={contentWidth} height={contentHeight}>
                <ErrorBoundary what="the Python usage">
                  <NwbUsageScript nwbUrl={nwbUrl} />
                </ErrorBoundary>
              </ScrollY>
            </TabPanel>
          </TabPanel>

          {tabsState.tabs.map((tab: DynamicTab) => (
            <TabPanel
              key={tab.id}
              tabsId="file-objects"
              tabId={tab.id}
              selected={tabsState.activeTabId === tab.id}
            >
              <ErrorBoundary what="this tab">
                {tab.type === "multi" ? (
                  <MultiTabView
                    nwbUrl={nwbUrl}
                    width={width}
                    height={contentHeight}
                    tabId={tab.id}
                    paths={tab.paths}
                    objectTypes={tab.objectTypes}
                    plugins={tab.plugins}
                    secondaryPathsList={tab.secondaryPathsList}
                    onOpenObjectInNewTab={handleOpenObjectInNewTab}
                  />
                ) : tab.type === "single" ? (
                  <SingleTabView
                    nwbUrl={nwbUrl}
                    width={width}
                    height={contentHeight}
                    tabId={tab.id}
                    path={tab.path}
                    objectType={tab.objectType}
                    plugin={tab.plugin}
                    secondaryPaths={tab.secondaryPaths}
                    onOpenObjectInNewTab={handleOpenObjectInNewTab}
                  />
                ) : null}
              </ErrorBoundary>
            </TabPanel>
          ))}
        </SetupNwbFileSpecificationsProvider>
      </div>
    </div>
  );
};

export default MainWorkspace;
