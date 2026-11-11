import { useMemo } from "react";

import { DefaultToolbarWidth } from "./TimeWidgetToolbarEntries";

const defaultMargins = {
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

export const useTimeScrollView2 = ({
  width,
  height,
  hideToolbar,
  leftMargin,
}: {
  width: number;
  height: number;
  hideToolbar?: boolean;
  leftMargin?: number;
}) => {
  const margins = useMemo(
    () => ({
      ...defaultMargins,
      left: leftMargin || defaultMargins.left,
    }),
    [leftMargin],
  );
  const toolbarWidth = hideToolbar ? 0 : DefaultToolbarWidth;
  const canvasWidth = width - toolbarWidth;
  const canvasHeight = height;
  return {
    margins,
    canvasWidth,
    canvasHeight,
    toolbarWidth,
  };
};
