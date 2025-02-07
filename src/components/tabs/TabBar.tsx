import { Box, Tab, Tabs } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { BaseTab } from "./tabsReducer";
import { SxProps } from "@mui/material";

export const TAB_BAR_HEIGHT = 48;

export interface TabBarProps<T extends BaseTab> {
  tabs: T[];
  activeTabId: string;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string, event: React.MouseEvent) => void;
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

const tabStyle: SxProps = {
  textTransform: "none",
};

export const TabBar = <T extends BaseTab>({
  tabs,
  activeTabId,
  onSwitchTab,
  onCloseTab,
  showMainTab = true,
  mainTabLabel = "MAIN",
  width,
}: TabBarProps<T>) => {
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
