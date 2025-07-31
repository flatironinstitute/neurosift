import { useCallback, useRef, useState } from "react";
import { useTimeRange } from "@shared/context-timeseries-selection-2";

type MouseData = {
  mouseDownAchorX: number | null;
  mouseDownAnchorTime: number | null;
  mouseDownAnchorVisibleStartTime: number | null;
  mouseDownAnchorPixelToTime: ((x: number) => number) | null;
  moved: boolean;
};

type UseTimeScrollMouseParams = {
  pixelToTime: (x: number) => number;
  visibleStartTimeSec: number | undefined;
  setCurrentTime: (time: number) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
};

const useTimeScrollMouse = (params: UseTimeScrollMouseParams) => {
  const {
    pixelToTime,
    visibleStartTimeSec,
    setCurrentTime,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseOut,
  } = params;

  const { panTimeseriesSelectionVisibleStartTimeSec } = useTimeRange();

  const [isViewClicked, setIsViewClicked] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | undefined>(undefined);

  const mouseData = useRef<MouseData>({
    mouseDownAchorX: null,
    mouseDownAnchorTime: null,
    mouseDownAnchorVisibleStartTime: null,
    mouseDownAnchorPixelToTime: null,
    moved: false,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsViewClicked(true);
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        mouseData.current.mouseDownAchorX =
          e.clientX - e.currentTarget.getBoundingClientRect().x;
        mouseData.current.mouseDownAnchorTime = pixelToTime(
          mouseData.current.mouseDownAchorX,
        );
        mouseData.current.mouseDownAnchorVisibleStartTime =
          visibleStartTimeSec || null;
        mouseData.current.mouseDownAnchorPixelToTime = pixelToTime;
        mouseData.current.moved = false;
      } else {
        if (onMouseDown) onMouseDown(e);
      }
    },
    [pixelToTime, onMouseDown, visibleStartTimeSec],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        mouseData.current.mouseDownAchorX = null;
        mouseData.current.mouseDownAnchorTime = null;
        mouseData.current.mouseDownAnchorPixelToTime = null;
        if (!mouseData.current.moved) {
          const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
          const t0 = pixelToTime(x);
          setCurrentTime(t0);
        }
      } else {
        if (onMouseUp) onMouseUp(e);
      }
    },
    [onMouseUp, pixelToTime, setCurrentTime],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
      const t0 = pixelToTime(x);
      setHoverTime(t0);

      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (
          mouseData.current.mouseDownAchorX !== null &&
          mouseData.current.mouseDownAnchorPixelToTime !== null
        ) {
          const currentX =
            e.clientX - e.currentTarget.getBoundingClientRect().x;
          const currentTime =
            mouseData.current.mouseDownAnchorPixelToTime(currentX);
          const anchorTime = mouseData.current.mouseDownAnchorTime;
          const anchorVisibleStartTime =
            mouseData.current.mouseDownAnchorVisibleStartTime;
          if (anchorTime !== null && anchorVisibleStartTime !== null) {
            const deltaTime = currentTime - anchorTime;
            const deltaX = currentX - mouseData.current.mouseDownAchorX;
            if (Math.abs(deltaX) > 2 || Math.abs(deltaTime) > 0.01) {
              const newVisibleStartTime = anchorVisibleStartTime - deltaTime;
              panTimeseriesSelectionVisibleStartTimeSec(newVisibleStartTime);
              e.preventDefault();
              e.stopPropagation();
              mouseData.current.moved = true;
            }
          }
        }
      }
      if (onMouseMove) onMouseMove(e);
    },
    [pixelToTime, onMouseMove],
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent) => {
      setHoverTime(undefined);
      setIsViewClicked(false);
      if (onMouseOut) onMouseOut(e);
    },
    [onMouseOut],
  );

  return {
    isViewClicked,
    hoverTime,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseOut,
  };
};

export default useTimeScrollMouse;
