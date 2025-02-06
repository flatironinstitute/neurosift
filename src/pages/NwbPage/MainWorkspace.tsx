import CloseIcon from "@mui/icons-material/Close";
import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useReducer } from "react";
import ScrollY from "../../components/ScrollY";
import MainTab from "./MainTab";
import NwbObjectView from "./NwbObjectView";
import { NwbObjectViewPlugin } from "./plugins/pluginInterface";
import tabsReducer from "./tabsReducer";
import { TAB_BAR_HEIGHT, tabsStyle, tabStyle } from "./tabStyles";
import TabToolbar, { TOOLBAR_HEIGHT } from "./TabToolbar";

import { findPluginByName } from "./plugins/registry";

type MainWorkspaceProps = {
  nwbUrl: string;
  width: number;
  height: number;
  initialTabId?: string;
};

const MainWorkspace = ({
  width,
  height,
  nwbUrl,
  initialTabId,
}: MainWorkspaceProps) => {
  const [tabsState, dispatch] = useReducer(tabsReducer, {
    tabs: [],
    activeTabId: "main",
  });

  useEffect(() => {
    if (initialTabId) {
      if (initialTabId.startsWith("view:")) {
        const a = initialTabId.split("|");
        if (a.length !== 2) {
          console.error("Invalid tab id", initialTabId);
          return;
        }
        const pluginName = a[0].substring("view:".length);
        const b = a[1].split("^");
        const path = b[0];
        const secondaryPaths = b.slice(1);
        const plugin = findPluginByName(pluginName);
        if (!plugin) {
          console.error("Plugin not found:", pluginName);
          return;
        }
        dispatch({
          type: "OPEN_TAB",
          id: initialTabId,
          path,
          plugin,
          secondaryPaths,
        });
      } else {
        dispatch({
          type: "OPEN_TAB",
          id: initialTabId,
          path: initialTabId,
        });
      }
    }
  }, [initialTabId]);

  const handleOpenObjectsInNewTab = (paths: string[]) => {
    if (paths.length === 1) {
      dispatch({ type: "OPEN_TAB", id: paths[0], path: paths[0] });
    } else {
      dispatch({ type: "OPEN_MULTI_TAB", paths });
    }
  };

  const handleOpenObjectInNewTab = (
    path: string,
    plugin?: NwbObjectViewPlugin,
    secondaryPaths?: string[],
  ) => {
    let id: string;
    if (secondaryPaths) {
      id = [path, ...secondaryPaths].join("^");
    } else {
      id = path;
    }
    if (plugin) {
      id = `view:${plugin.name}|${id}`;
    }
    dispatch({ type: "OPEN_TAB", id, path, plugin, secondaryPaths });
  };

  const handleCloseTab = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    dispatch({ type: "CLOSE_TAB", id });
  };

  const tabBarHeight = TAB_BAR_HEIGHT;
  const contentHeight = height - tabBarHeight;

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width,
          height: tabBarHeight,
          left: 10,
          top: 12,
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
          <Tabs
            sx={tabsStyle}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            value={tabsState.activeTabId ?? 0}
            onChange={(_, value) => {
              if (typeof value === "string") {
                dispatch({ type: "SWITCH_TO_TAB", id: value });
              }
            }}
          >
            <Tab key="main" label="MAIN" value="main" sx={tabStyle} />
            {tabsState.tabs.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                sx={tabStyle}
                label={tab.label}
                icon={<CloseIcon sx={{ fontSize: 14 }} />}
                iconPosition="end"
                onClick={(e: React.MouseEvent) => {
                  // Check if click was on the icon area
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();
                  if (e.clientX > rect.right - 30) {
                    // Approximate icon click area
                    handleCloseTab(tab.id, e);
                  }
                }}
              />
            ))}
          </Tabs>
        </Box>
      </div>
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
          <ScrollY width={width - 20} height={contentHeight}>
            <MainTab
              nwbUrl={nwbUrl}
              onOpenObjectInNewTab={handleOpenObjectInNewTab}
              onOpenObjectsInNewTab={handleOpenObjectsInNewTab}
            />
          </ScrollY>
        </div>
        {tabsState.tabs.map((tab) => {
          if (tab.type === "multi") {
            return (
              <div
                key={tab.id}
                style={{
                  display: tabsState.activeTabId === tab.id ? "block" : "none",
                }}
              >
                <div>
                  <TabToolbar
                    width={width - 20}
                    tabId={tab.id}
                    nwbUrl={nwbUrl}
                    paths={tab.paths}
                  />
                  <ScrollY
                    width={width - 20}
                    height={contentHeight - TOOLBAR_HEIGHT}
                    top={TOOLBAR_HEIGHT}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 20,
                        padding: 20,
                      }}
                    >
                      {tab.paths.map((path, index) => (
                        <div key={path}>
                          {index > 0 && <hr style={{ margin: "20px 0" }} />}
                          <NwbObjectView
                            nwbUrl={nwbUrl}
                            path={path}
                            onOpenObjectInNewTab={handleOpenObjectInNewTab}
                            plugin={undefined} // Multi-tab views don't use specific plugins
                            width={undefined}
                            height={undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </ScrollY>
                </div>
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
                <div>
                  <TabToolbar
                    width={width}
                    tabId={tab.id}
                    nwbUrl={nwbUrl}
                    path={tab.path}
                  />
                  <ScrollY
                    width={width}
                    height={contentHeight - TOOLBAR_HEIGHT}
                    top={TOOLBAR_HEIGHT}
                  >
                    <NwbObjectView
                      nwbUrl={nwbUrl}
                      path={tab.path}
                      onOpenObjectInNewTab={handleOpenObjectInNewTab}
                      plugin={tab.type === "single" ? tab.plugin : undefined}
                      secondaryPaths={tab.secondaryPaths}
                      width={width - 20}
                      height={contentHeight - TOOLBAR_HEIGHT - 5}
                    />
                  </ScrollY>
                </div>
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
