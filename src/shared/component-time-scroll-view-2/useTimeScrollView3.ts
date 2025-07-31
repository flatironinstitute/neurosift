import { useMemo } from "react";

const DefaultToolbarWidth = 18;

const defaultMargins = {
  left: 50,
  right: 20,
  top: 20,
  bottom: 40,
};

export const useTimeScrollView3 = ({
  width,
  height,
  hideToolbar,
  leftMargin,
  bottomToolbarHeight,
}: {
  width: number;
  height: number;
  hideToolbar?: boolean;
  leftMargin?: number;
  bottomToolbarHeight?: number;
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
  const canvasHeight = height - (bottomToolbarHeight || 0);
  return {
    margins,
    canvasWidth,
    canvasHeight,
    toolbarWidth,
  };
};
