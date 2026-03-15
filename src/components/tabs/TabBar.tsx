import { Box, Tab, Tabs } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BaseTab } from "./tabsReducer";
import { SxProps } from "@mui/material";

export const FIXED_TAB_BAR_HEIGHT = 44;
export const DYNAMIC_TAB_BAR_HEIGHT = 36;
export const TAB_BAR_HEIGHT = FIXED_TAB_BAR_HEIGHT; // default for non-fixed usage

export interface FixedTab {
  id: string;
  label: string;
}

export interface TabBarProps<T extends BaseTab> {
  tabs: T[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, event: React.MouseEvent) => void;
  fixedTabs?: FixedTab[];
  fixedTabActiveId?: string;
  onFixedTabSwitch?: (id: string) => void;
  showMainTab?: boolean;
  mainTabLabel?: string;
  width: number;
}

const tabsStyle: SxProps = {
  minHeight: 32,
  "& .MuiTab-root": {
    minHeight: 32,
    padding: "6px 12px",
  },
  "& .MuiTab-iconWrapper": {
    marginLeft: "8px",
  },
  "& .MuiTabScrollButton-root": {
    height: 32,
    width: 28,
    "&.Mui-disabled": {
      opacity: 0.3,
    },
  },
};

const fixedTabsStyle: SxProps = {
  minHeight: 36,
  "& .MuiTabs-indicator": {
    display: "none",
  },
  "& .MuiTab-root": {
    minHeight: 32,
    padding: "4px 16px",
    margin: "0 3px",
    borderRadius: "6px",
    border: "1px solid #d0d0d0",
    backgroundColor: "#f5f5f5",
    color: "#555",
    fontWeight: 500,
    fontSize: 13,
    textTransform: "none",
    transition: "all 0.15s ease",
    "&:hover": {
      backgroundColor: "#e8e8e8",
      borderColor: "#bbb",
    },
    "&.Mui-selected": {
      backgroundColor: "#1976d2",
      borderColor: "#1976d2",
      color: "#fff",
      fontWeight: 600,
    },
  },
  "& .MuiTabScrollButton-root": {
    height: 32,
    width: 28,
    "&.Mui-disabled": {
      opacity: 0.3,
    },
  },
};

const dynamicTabsStyle: SxProps = {
  minHeight: 28,
  "& .MuiTab-root": {
    minHeight: 28,
    padding: "4px 10px",
    fontSize: 12,
    textTransform: "none",
  },
  "& .MuiTab-iconWrapper": {
    marginLeft: "6px",
  },
  "& .MuiTabScrollButton-root": {
    height: 28,
    width: 24,
    "&.Mui-disabled": {
      opacity: 0.3,
    },
  },
};

const tabStyle: SxProps = {
  textTransform: "none",
};

export const TabBar = <T extends BaseTab>({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  fixedTabs,
  fixedTabActiveId,
  onFixedTabSwitch,
  showMainTab = true,
  mainTabLabel = "MAIN",
  width,
}: TabBarProps<T>) => {
  if (fixedTabs) {
    const hasDynamicTabs = tabs.length > 0;
    return (
      <div
        style={{
          position: "absolute",
          width,
          left: 10,
          top: 12,
        }}
      >
        {/* Fixed section tabs row */}
        <Tabs
          sx={fixedTabsStyle}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          value={fixedTabActiveId ?? false}
          onChange={(_, value) => onFixedTabSwitch?.(value)}
        >
          {fixedTabs.map((ft) => (
            <Tab key={ft.id} label={ft.label} value={ft.id} />
          ))}
        </Tabs>

        {/* Dynamic object tabs row */}
        {hasDynamicTabs && (
          <Box sx={{ borderBottom: 1, borderColor: "divider", mt: 0.5 }}>
            <Tabs
              sx={dynamicTabsStyle}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              value={activeTabId}
              onChange={(_, value) => onSwitchTab(value)}
            >
              <Tab
                key="main"
                value="main"
                sx={tabStyle}
                label="Main"
              />
              {tabs.map((tab) => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  sx={tabStyle}
                  label={tab.label}
                  icon={<CloseIcon sx={{ fontSize: 12 }} />}
                  iconPosition="end"
                  onClick={(e: React.MouseEvent) => {
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    if (e.clientX > rect.right - 26) {
                      onCloseTab(tab.id, e);
                    }
                  }}
                />
              ))}
            </Tabs>
          </Box>
        )}
      </div>
    );
  }

  // Legacy single-row mode (used by DatasetWorkspace)
  return (
    <div
      style={{
        position: "absolute",
        width,
        height: TAB_BAR_HEIGHT,
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
          value={activeTabId}
          onChange={(_, value) => onSwitchTab(value)}
        >
          {showMainTab && (
            <Tab key="main" label={mainTabLabel} value="main" sx={tabStyle} />
          )}
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              value={tab.id}
              sx={tabStyle}
              label={tab.label}
              icon={<CloseIcon sx={{ fontSize: 14 }} />}
              iconPosition="end"
              onClick={(e: React.MouseEvent) => {
                const rect = (
                  e.currentTarget as HTMLElement
                ).getBoundingClientRect();
                if (e.clientX > rect.right - 30) {
                  onCloseTab(tab.id, e);
                }
              }}
            />
          ))}
        </Tabs>
      </Box>
    </div>
  );
};
