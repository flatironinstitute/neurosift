import React, { useEffect, useState } from "react";
import { FixedTab, TabBar } from "@components/tabs/TabBar";
import { TAB_BAR_HEIGHT } from "./tabStyles";
import { useTabManager } from "./TabManager";
import SingleTabView from "./components/SingleTabView";
import MultiTabView from "./components/MultiTabView";
import BreadcrumbBar, { BREADCRUMB_HEIGHT } from "./components/BreadcrumbBar";
import AuthErrorNotification from "./components/AuthErrorNotification";
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
    handleOpenObject,
    handleOpenObjects,
    handleClearSubView,
    handleSwitchTab,
  } = useTabManager({ nwbUrl, initialTabId });

  const [showAuthError, setShowAuthError] = useState(false);
  const [defaultUnitsPath, setDefaultUnitsPath] = useState<
    string | undefined
  >();

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentWidth = width - 20;

  const { neurodataSubView } = tabsState;
  const showBreadcrumb =
    tabsState.activeTabId === "neurodata" && neurodataSubView !== null;
  const contentHeight =
    height - tabBarHeight - (showBreadcrumb ? BREADCRUMB_HEIGHT : 0);

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
        tabs={[]}
        activeTabId={tabsState.activeTabId}
        onSwitchTab={handleSwitchTab}
        onCloseTab={() => {}}
        fixedTabs={FIXED_TABS}
        showMainTab={false}
        width={width}
      />

      {/* Breadcrumb bar when viewing an object */}
      {showBreadcrumb && neurodataSubView && (
        <div
          style={{
            position: "absolute",
            left: 10,
            width: contentWidth,
            top: tabBarHeight,
          }}
        >
          <BreadcrumbBar
            subView={neurodataSubView}
            onNavigateBack={handleClearSubView}
            nwbUrl={nwbUrl}
          />
        </div>
      )}

      <div
        style={{
          position: "absolute",
          left: 10,
          width: contentWidth,
          height: contentHeight,
          top: tabBarHeight + (showBreadcrumb ? BREADCRUMB_HEIGHT : 0),
          overflow: "hidden",
        }}
      >
        <SetupNwbFileSpecificationsProvider nwbUrl={nwbUrl}>
          {/* Neurodata tab */}
          <div
            style={{
              display:
                tabsState.activeTabId === "neurodata" ? "block" : "none",
            }}
          >
            {neurodataSubView === null ? (
              <ScrollY width={contentWidth} height={contentHeight}>
                <NwbHierarchyView
                  nwbUrl={nwbUrl}
                  onOpenObjectInNewTab={handleOpenObject}
                  onOpenObjectsInNewTab={handleOpenObjects}
                  isExpanded={tabsState.activeTabId === "neurodata"}
                  defaultUnitsPath={defaultUnitsPath}
                  onSetDefaultUnitsPath={setDefaultUnitsPath}
                />
              </ScrollY>
            ) : neurodataSubView.type === "single" ? (
              <SingleTabView
                nwbUrl={nwbUrl}
                width={contentWidth}
                height={contentHeight}
                path={neurodataSubView.path}
                objectType={neurodataSubView.objectType}
                plugin={neurodataSubView.plugin}
                secondaryPaths={neurodataSubView.secondaryPaths}
                onOpenObjectInNewTab={handleOpenObject}
              />
            ) : (
              <MultiTabView
                nwbUrl={nwbUrl}
                width={contentWidth}
                height={contentHeight}
                paths={neurodataSubView.paths}
                objectTypes={neurodataSubView.objectTypes}
                plugins={neurodataSubView.plugins}
                secondaryPathsList={neurodataSubView.secondaryPathsList}
                onOpenObjectInNewTab={handleOpenObject}
              />
            )}
          </div>

          {/* HDF5 tab */}
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

          {/* Timeseries Alignment tab */}
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
                  handleOpenObject(path);
                }}
              />
            </ScrollY>
          </div>

          {/* Specifications tab */}
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

          {/* Python Usage tab */}
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
        </SetupNwbFileSpecificationsProvider>
      </div>
    </div>
  );
};

export default MainWorkspace;
