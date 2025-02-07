import { ReactNode } from "react";
import { BaseTab } from "./tabsReducer";
import ScrollY from "../ScrollY";

export interface TabContentProps<T extends BaseTab> {
  tabs: T[];
  activeTabId: string;
  width: number;
  height: number;
  renderMainTab?: () => ReactNode;
  renderTabContent: (tab: T) => ReactNode;
  showMainTab?: boolean;
  useScrollY?: boolean;
}

export const TabContent = <T extends BaseTab>({
  tabs,
  activeTabId,
  width,
  height,
  renderMainTab,
  renderTabContent,
  showMainTab = true,
  useScrollY = true,
}: TabContentProps<T>) => {
  const content = (node: ReactNode) => {
    if (useScrollY) {
      return (
        <ScrollY width={width} height={height}>
          {node}
        </ScrollY>
      );
    }
    return node;
  };

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
      }}
    >
      {showMainTab && renderMainTab && (
        <div
          style={{
            display: activeTabId === "main" ? "block" : "none",
            height: "100%",
          }}
        >
          {content(renderMainTab())}
        </div>
      )}

      {tabs.map((tab) => (
        <div
          key={tab.id}
          style={{
            display: activeTabId === tab.id ? "block" : "none",
            height: "100%",
          }}
        >
          {content(renderTabContent(tab))}
        </div>
      ))}
    </div>
  );
};
