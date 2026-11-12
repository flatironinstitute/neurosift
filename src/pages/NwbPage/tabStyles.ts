import { SxProps } from "@mui/material";

export const tabsStyle: SxProps = {
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

export const tabStyle: SxProps = {
  textTransform: "none",
};

export const TAB_BAR_HEIGHT = 50;
