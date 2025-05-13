import React, { useEffect, useState } from "react";
import { TabBar } from "@components/tabs/TabBar";
import { TAB_BAR_HEIGHT } from "./tabStyles";
import { useTabManager } from "./TabManager";
import TabContent from "./components/TabContent";
import SingleTabView from "./components/SingleTabView";
import MultiTabView from "./components/MultiTabView";
import AuthErrorNotification from "./components/AuthErrorNotification";
import { DynamicTab } from "./Types/index";
import { hasAuthError, isDandiAssetUrl } from "./hdf5Interface";

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

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;

  // Check for authentication errors
  useEffect(() => {
    if (nwbUrl) {
      const checkAuthError = () => {
        const hasError = hasAuthError(nwbUrl);
        setShowAuthError(hasError);
      };

      // Check immediately
      checkAuthError();

      // Also set up interval to periodically check for auth errors as they might
      // be detected during data loading after component mount
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
          <TabContent
            nwbUrl={nwbUrl}
            width={width - 20}
            height={contentHeight}
            onOpenObjectInNewTab={handleOpenObjectInNewTab}
            onOpenObjectsInNewTab={handleOpenObjectsInNewTab}
          />
        </div>
        {tabsState.tabs.map((tab: DynamicTab) => {
          if (tab.type === "multi") {
            return (
              <div
                key={tab.id}
                style={{
                  display: tabsState.activeTabId === tab.id ? "block" : "none",
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
                  display: tabsState.activeTabId === tab.id ? "block" : "none",
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
          return null; // For main tab type
        })}
      </div>
    </div>
  );
};

export default MainWorkspace;
