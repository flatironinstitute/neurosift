import { Tab, Tabs } from "@mui/material";
import { FunctionComponent, useEffect } from "react";

type Props = {
  tabs: {
    id: string;
    label: string;
    title?: string;
    closeable: boolean;
    icon?: any;
  }[];
  currentTabIndex: number | undefined;
  onCurrentTabIndexChanged: (i: number) => void;
  onCloseTab?: (id: string) => void;
};

const TabWidgetTabBar: FunctionComponent<Props> = ({
  tabs,
  currentTabIndex,
  onCurrentTabIndexChanged,
  onCloseTab,
}) => {
  useEffect(() => {
    if (currentTabIndex === undefined) {
      if (tabs.length > 0) {
        onCurrentTabIndexChanged(0);
      }
    }
  }, [currentTabIndex, onCurrentTabIndexChanged, tabs.length]);
  return (
    <Tabs
      value={currentTabIndex || 0}
      scrollButtons="auto"
      variant="scrollable"
      onChange={(e, value) => {
        onCurrentTabIndexChanged(value);
      }}
    >
      {tabs.map((tab, i) => (
        <Tab
          key={i}
          title={tab.title}
          label={
            <span>
              {tab.icon ? (
                <span style={{ marginRight: 4 }}>{tab.icon}</span>
              ) : (
                <span />
              )}
              <span style={{ textTransform: "none", fontSize: 14 }}>
                {tab.label}
              </span>
              &nbsp;&nbsp;
              {tab.closeable && onCloseTab && (
                <span
                  onClick={() => {
                    onCloseTab(tab.id);
                  }}
                >
                  ✕
                </span>
              )}
            </span>
          }
          sx={{ minHeight: 0, height: 0, fontSize: 12 }}
        />
      ))}
    </Tabs>
  );
};

export default TabWidgetTabBar;
