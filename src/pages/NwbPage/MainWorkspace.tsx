import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  lazy,
  Suspense,
} from "react";
import {
  FixedTab,
  TabBar,
  FIXED_TAB_BAR_HEIGHT,
  DYNAMIC_TAB_BAR_HEIGHT,
} from "@components/tabs/TabBar";
import { useTabManager } from "./TabManager";
import SingleTabView from "./components/SingleTabView";
import MultiTabView from "./components/MultiTabView";
import AuthErrorNotification from "./components/AuthErrorNotification";
import { DynamicTab } from "./Types/index";
import { getHdf5Group, hasAuthError, isDandiAssetUrl } from "./hdf5Interface";
import { SetupNwbFileSpecificationsProvider } from "./SpecificationsView/SetupNwbFileSpecificationsProvider";
import ScrollY from "@components/ScrollY";
import NwbHierarchyView from "./NwbHierarchyView";
import Hdf5View from "./Hdf5View";
import TimeseriesAlignmentView from "./TimeseriesAlignmentView";
import NwbUsageScript from "./components/NwbUsageScript";
import MultiVideoTabView from "./MultiVideoTabView";
import IcephysTabView from "./IcephysTabView";
import { hasExternalVideos } from "./externalVideoUtils";

const SpecificationsView = lazy(
  () => import("./SpecificationsView/SpecificationsView"),
);

// All possible fixed tabs. "video-widget" and "icephys" are data-dependent and
// only shown when the file actually contains the corresponding data (see below),
// so they do not appear as dead buttons.
const ALL_FIXED_TABS: FixedTab[] = [
  { id: "widgets", label: "Widgets" },
  { id: "video-widget", label: "Videos" },
  { id: "icephys", label: "Icephys" },
  { id: "timeseries-alignment", label: "Timeseries Alignment" },
  { id: "python-usage", label: "Python Usage" },
  { id: "specifications", label: "Schema", group: "secondary" },
  { id: "hdf5", label: "HDF5", group: "secondary" },
];

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
    FIXED_TAB_BAR_HEIGHT + (hasDynamicTabs ? DYNAMIC_TAB_BAR_HEIGHT : 0);
  const contentHeight = height - tabBarHeight;
  const contentWidth = width - 20;

  // Determine what content to show:
  // If activeTabId matches a dynamic tab, show that; otherwise show the active fixed section
  const isDynamicTabActive = tabsState.tabs.some(
    (t: DynamicTab) => t.id === tabsState.activeTabId,
  );
  const showFixedContent = !isDynamicTabActive;

  // Check if /units exists
  useEffect(() => {
    const checkUnits = async () => {
      const group = await getHdf5Group(nwbUrl, "/units");
      if (group && group.attrs.neurodata_type === "Units") {
        setDefaultUnitsPath("/units");
      }
    };
    checkUnits();
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

  const updateUrlTab = useCallback((tabId: string) => {
    const url = new URL(window.location.href);
    if (tabId === "widgets") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tabId);
    }
    window.history.replaceState({}, "", url.toString());
  }, []);

  useEffect(() => {
    updateUrlTab(effectiveActiveTab);
  }, [effectiveActiveTab, updateUrlTab]);

  const handleFixedTabSwitch = (id: string) => {
    setActiveFixedTab(id);
    // Switch the reducer to a non-dynamic-tab id so the dynamic tab row deselects
    handleSwitchTab(id);
  };

  const handleDynamicTabSwitch = (id: string) => {
    if (id === "main") {
      // Switch back to showing the active fixed section
      handleSwitchTab(activeFixedTab);
    } else {
      handleSwitchTab(id);
    }
  };

  const handleDynamicTabClose = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    handleCloseTab(id, event);
  };

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      {/* Error notification as overlay */}
      {showAuthError && isDandiAssetUrl(nwbUrl) && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <AuthErrorNotification dandiUrl={nwbUrl} />
        </div>
      )}

      <TabBar
        tabs={tabsState.tabs}
        activeTabId={isDynamicTabActive ? tabsState.activeTabId : "main"}
        onSwitchTab={handleDynamicTabSwitch}
        onCloseTab={handleDynamicTabClose}
        fixedTabs={fixedTabs}
        fixedTabActiveId={activeFixedTab}
        onFixedTabSwitch={handleFixedTabSwitch}
        width={width}
      />
      <div
        style={{
          position: "absolute",
          left: 10,
          width: contentWidth,
          height: contentHeight,
          top: tabBarHeight,
          overflow: "hidden",
        }}
      >
        <SetupNwbFileSpecificationsProvider nwbUrl={nwbUrl}>
          {/* Fixed section content */}
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "widgets"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <NwbHierarchyView
                nwbUrl={nwbUrl}
                onOpenObjectInNewTab={handleOpenObjectInNewTab}
                onOpenObjectsInNewTab={handleOpenObjectsInNewTab}
                isExpanded={showFixedContent && activeFixedTab === "widgets"}
                defaultUnitsPath={defaultUnitsPath}
                onSetDefaultUnitsPath={setDefaultUnitsPath}
              />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "hdf5"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <Hdf5View
                nwbUrl={nwbUrl}
                width={contentWidth}
                isExpanded={showFixedContent && activeFixedTab === "hdf5"}
              />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "video-widget"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <MultiVideoTabView
                nwbUrl={nwbUrl}
                width={contentWidth}
                height={contentHeight}
                isExpanded={
                  showFixedContent && activeFixedTab === "video-widget"
                }
              />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "icephys"
                  ? "block"
                  : "none",
            }}
          >
            <IcephysTabView
              nwbUrl={nwbUrl}
              width={contentWidth}
              height={contentHeight}
              isExpanded={showFixedContent && activeFixedTab === "icephys"}
            />
          </div>
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "timeseries-alignment"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <TimeseriesAlignmentView
                nwbUrl={nwbUrl}
                width={contentWidth}
                isExpanded={
                  showFixedContent && activeFixedTab === "timeseries-alignment"
                }
                onOpenTimeseriesItem={(path) => {
                  handleOpenObjectInNewTab(path);
                }}
              />
            </ScrollY>
          </div>
          {showFixedContent && activeFixedTab === "specifications" && (
            <ScrollY width={contentWidth} height={contentHeight}>
              <Suspense
                fallback={
                  <div style={{ padding: 20 }}>Loading specifications...</div>
                }
              >
                <SpecificationsView />
              </Suspense>
            </ScrollY>
          )}
          <div
            style={{
              display:
                showFixedContent && activeFixedTab === "python-usage"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <NwbUsageScript nwbUrl={nwbUrl} />
            </ScrollY>
          </div>

          {/* Dynamic object tabs */}
          {tabsState.tabs.map((tab: DynamicTab) => {
            if (tab.type === "multi") {
              return (
                <div
                  key={tab.id}
                  style={{
                    display:
                      tabsState.activeTabId === tab.id ? "block" : "none",
                  }}
                >
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
                </div>
              );
            } else if (tab.type === "single") {
              return (
                <div
                  key={tab.id}
                  style={{
                    display:
                      tabsState.activeTabId === tab.id ? "block" : "none",
                  }}
                >
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
                </div>
              );
            }
            return null;
          })}
        </SetupNwbFileSpecificationsProvider>
      </div>
    </div>
  );
};

export default MainWorkspace;
