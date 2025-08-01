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
  hasCustomActions,
}: {
  width: number;
  height: number;
  hideToolbar?: boolean;
  leftMargin?: number;
  hasCustomActions?: boolean;
}) => {
  const margins = useMemo(
    () => ({
      ...defaultMargins,
      left: leftMargin || defaultMargins.left,
    }),
    [leftMargin],
  );
  const toolbarWidth = hideToolbar ? 0 : DefaultToolbarWidth;
  // Calculate bottom toolbar height: 40px for main toolbar + 40px for custom actions (if present)
  const bottomToolbarHeight = hasCustomActions ? 80 : 40;
  const canvasWidth = width - toolbarWidth;
  const canvasHeight = height - bottomToolbarHeight;
  return {
    margins,
    canvasWidth,
    canvasHeight,
    toolbarWidth,
  };
};
