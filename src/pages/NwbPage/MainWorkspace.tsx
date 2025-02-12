import React from "react";
import { TabBar } from "@components/tabs/TabBar";
import { TAB_BAR_HEIGHT } from "./tabStyles";
import { useTabManager } from "./TabManager";
import TabContent from "./components/TabContent";
import SingleTabView from "./components/SingleTabView";
import MultiTabView from "./components/MultiTabView";
import { DynamicTab } from "./Types";

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

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
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
