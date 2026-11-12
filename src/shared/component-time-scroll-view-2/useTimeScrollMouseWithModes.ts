import { useCallback, useRef, useState } from "react";
import { useTimeRange } from "@shared/context-timeseries-selection-2";
import { InteractionMode } from "./TimeScrollToolbar";

type MouseData = {
  mouseDownAchorX: number | null;
  mouseDownAnchorTime: number | null;
  mouseDownAnchorVisibleStartTime: number | null;
  mouseDownAnchorPixelToTime: ((x: number) => number) | null;
  moved: boolean;
  selectionStartX: number | null;
  selectionEndX: number | null;
};

type UseTimeScrollMouseWithModesParams = {
  pixelToTime: (x: number) => number;
  visibleStartTimeSec: number | undefined;
  setCurrentTime: (time: number) => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseOut?: (e: React.MouseEvent) => void;
  onCanvasClick?: (x: number, y: number) => void;
  interactionMode: InteractionMode;
};

const useTimeScrollMouseWithModes = (
  params: UseTimeScrollMouseWithModesParams,
) => {
  const {
    pixelToTime,
    visibleStartTimeSec,
    setCurrentTime,
    onMouseDown,
    onMouseUp,
    onMouseMove,
    onMouseOut,
    onCanvasClick,
    interactionMode,
  } = params;

  const { panTimeseriesSelectionVisibleStartTimeSec, setVisibleTimeRange } =
    useTimeRange();

  const [isViewClicked, setIsViewClicked] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | undefined>(undefined);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    endX: number;
  } | null>(null);

  const mouseData = useRef<MouseData>({
    mouseDownAchorX: null,
    mouseDownAnchorTime: null,
    mouseDownAnchorVisibleStartTime: null,
    mouseDownAnchorPixelToTime: null,
    moved: false,
    selectionStartX: null,
    selectionEndX: null,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsViewClicked(true);
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        const x = e.clientX - e.currentTarget.getBoundingClientRect().x;

        if (interactionMode === "select-zoom") {
          mouseData.current.selectionStartX = x;
          mouseData.current.selectionEndX = x;
          setSelectionRect({ startX: x, endX: x });
        } else {
          // Pan mode
          mouseData.current.mouseDownAchorX = x;
          mouseData.current.mouseDownAnchorTime = pixelToTime(x);
          mouseData.current.mouseDownAnchorVisibleStartTime =
            visibleStartTimeSec || null;
          mouseData.current.mouseDownAnchorPixelToTime = pixelToTime;
        }
        mouseData.current.moved = false;
      } else {
        if (onMouseDown) onMouseDown(e);
      }
    },
    [pixelToTime, onMouseDown, visibleStartTimeSec, interactionMode],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        const x = e.clientX - e.currentTarget.getBoundingClientRect().x;

        if (
          interactionMode === "select-zoom" &&
          mouseData.current.selectionStartX !== null
        ) {
          const startX = Math.min(mouseData.current.selectionStartX, x);
          const endX = Math.max(mouseData.current.selectionStartX, x);

          if (Math.abs(endX - startX) > 5) {
            // Only zoom if selection is meaningful
            const startTime = pixelToTime(startX);
            const endTime = pixelToTime(endX);
            setVisibleTimeRange(startTime, endTime);
          } else if (!mouseData.current.moved) {
            // Single click - set current time and call canvas click callback
            const t0 = pixelToTime(x);
            setCurrentTime(t0);

            if (onCanvasClick) {
              const y = e.clientY - e.currentTarget.getBoundingClientRect().y;
              onCanvasClick(x, y);
            }
          }

          setSelectionRect(null);
          mouseData.current.selectionStartX = null;
          mouseData.current.selectionEndX = null;
        } else {
          // Pan mode
          mouseData.current.mouseDownAchorX = null;
          mouseData.current.mouseDownAnchorTime = null;
          mouseData.current.mouseDownAnchorPixelToTime = null;
          if (!mouseData.current.moved) {
            const t0 = pixelToTime(x);
            setCurrentTime(t0);

            if (onCanvasClick) {
              const y = e.clientY - e.currentTarget.getBoundingClientRect().y;
              onCanvasClick(x, y);
            }
          }
        }
      } else {
        if (onMouseUp) onMouseUp(e);
      }
    },
    [
      onMouseUp,
      pixelToTime,
      setCurrentTime,
      interactionMode,
      setVisibleTimeRange,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX - e.currentTarget.getBoundingClientRect().x;
      const t0 = pixelToTime(x);
      setHoverTime(t0);

      if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        if (
          interactionMode === "select-zoom" &&
          mouseData.current.selectionStartX !== null
        ) {
          // Update selection rectangle
          mouseData.current.selectionEndX = x;
          setSelectionRect({
            startX: Math.min(mouseData.current.selectionStartX, x),
            endX: Math.max(mouseData.current.selectionStartX, x),
          });
          mouseData.current.moved = true;
        } else if (
          interactionMode === "pan" &&
          mouseData.current.mouseDownAchorX !== null &&
          mouseData.current.mouseDownAnchorPixelToTime !== null
        ) {
          // Pan mode logic
          const currentTime = mouseData.current.mouseDownAnchorPixelToTime(x);
          const anchorTime = mouseData.current.mouseDownAnchorTime;
          const anchorVisibleStartTime =
            mouseData.current.mouseDownAnchorVisibleStartTime;

          if (anchorTime !== null && anchorVisibleStartTime !== null) {
            const deltaTime = currentTime - anchorTime;
            const deltaX = x - mouseData.current.mouseDownAchorX;
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
    [
      pixelToTime,
      onMouseMove,
      interactionMode,
      panTimeseriesSelectionVisibleStartTimeSec,
    ],
  );

  const handleMouseOut = useCallback(
    (e: React.MouseEvent) => {
      setHoverTime(undefined);
      setIsViewClicked(false);
      setSelectionRect(null);
      mouseData.current.selectionStartX = null;
      mouseData.current.selectionEndX = null;
      if (onMouseOut) onMouseOut(e);
    },
    [onMouseOut],
  );

  return {
    isViewClicked,
    hoverTime,
    selectionRect,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    handleMouseOut,
  };
};

export default useTimeScrollMouseWithModes;
