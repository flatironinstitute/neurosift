import React, { useEffect, useState } from "react";
import { FixedTab, TabBar } from "@components/tabs/TabBar";
import { TAB_BAR_HEIGHT } from "./tabStyles";
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
import SpecificationsView from "./SpecificationsView/SpecificationsView";
import NwbUsageScript from "./components/NwbUsageScript";

const FIXED_TABS: FixedTab[] = [
  { id: "neurodata", label: "Neurodata" },
  { id: "timeseries-alignment", label: "Timeseries Alignment" },
  { id: "python-usage", label: "Python Usage" },
  { id: "specifications", label: "Specifications" },
  { id: "hdf5", label: "HDF5" },
];

const FIXED_TAB_IDS = new Set(FIXED_TABS.map((t) => t.id));

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
  const {
    tabsState,
    handleOpenObjectsInNewTab,
    handleOpenObjectInNewTab,
    handleCloseTab,
    handleSwitchTab,
  } = useTabManager({ nwbUrl, initialTabId });

  const [showAuthError, setShowAuthError] = useState(false);
  const [defaultUnitsPath, setDefaultUnitsPath] = useState<
    string | undefined
  >();

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;
  const contentWidth = width - 20;

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
        activeTabId={tabsState.activeTabId}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
        fixedTabs={FIXED_TABS}
        showMainTab={false}
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
          {/* Fixed section tabs */}
          <div
            style={{
              display:
                tabsState.activeTabId === "neurodata" ? "block" : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <NwbHierarchyView
                nwbUrl={nwbUrl}
                onOpenObjectInNewTab={handleOpenObjectInNewTab}
                onOpenObjectsInNewTab={handleOpenObjectsInNewTab}
                isExpanded={tabsState.activeTabId === "neurodata"}
                defaultUnitsPath={defaultUnitsPath}
                onSetDefaultUnitsPath={setDefaultUnitsPath}
              />
            </ScrollY>
          </div>
          <div
            style={{
              display: tabsState.activeTabId === "hdf5" ? "block" : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <Hdf5View
                nwbUrl={nwbUrl}
                width={contentWidth}
                isExpanded={tabsState.activeTabId === "hdf5"}
              />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                tabsState.activeTabId === "timeseries-alignment"
                  ? "block"
                  : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <TimeseriesAlignmentView
                nwbUrl={nwbUrl}
                width={contentWidth}
                isExpanded={tabsState.activeTabId === "timeseries-alignment"}
                onOpenTimeseriesItem={(path) => {
                  handleOpenObjectInNewTab(path);
                }}
              />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                tabsState.activeTabId === "specifications" ? "block" : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <SpecificationsView />
            </ScrollY>
          </div>
          <div
            style={{
              display:
                tabsState.activeTabId === "python-usage" ? "block" : "none",
            }}
          >
            <ScrollY width={contentWidth} height={contentHeight}>
              <NwbUsageScript nwbUrl={nwbUrl} />
            </ScrollY>
          </div>

          {/* Dynamic object tabs */}
          {tabsState.tabs.map((tab: DynamicTab) => {
            if (FIXED_TAB_IDS.has(tab.id)) return null;
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
