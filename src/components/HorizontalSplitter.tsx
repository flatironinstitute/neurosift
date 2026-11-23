import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@ui";
import "./HorizontalSplitter.css";

export interface HorizontalSplitterProps {
  width: number;
  height: number;
  initialSplitterPosition: number;
  children: [React.ReactNode, React.ReactNode]; // Exactly two children required
  /** Whether the left panel is folded to a rail; left out, the splitter keeps it itself. */
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const SPLITTER_WIDTH = 8; // Width of the splitter handle area in pixels
export const RAIL_WIDTH = 40;

const HorizontalSplitter: FunctionComponent<HorizontalSplitterProps> = ({
  width,
  height,
  initialSplitterPosition,
  children,
  collapsed: collapsedProp,
  onCollapsedChange,
}) => {
  const [splitterPosition, setSplitterPosition] = useState(
    initialSplitterPosition,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [ownCollapsed, setOwnCollapsed] = useState(false);
  const collapsed = collapsedProp ?? ownCollapsed;
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - containerRect.left;
      // Constrain position to reasonable bounds (minimum 100px from either edge)
      const constrainedPosition = Math.max(
        100,
        Math.min(width - 100, relativeX),
      );
      setSplitterPosition(constrainedPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    // Add a class to the body to prevent text selection during drag
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging, width]);

  // Ensure splitter stays within bounds if width changes
  useEffect(() => {
    setSplitterPosition((prev) => Math.max(100, Math.min(width - 100, prev)));
  }, [width]);

  const setCollapsed = (next: boolean) => {
    if (onCollapsedChange) onCollapsedChange(next);
    else setOwnCollapsed(next);
  };

  const leftPanelWidth = collapsed
    ? RAIL_WIDTH
    : splitterPosition - SPLITTER_WIDTH / 2;
  const rightPanelLeft = collapsed
    ? RAIL_WIDTH
    : splitterPosition + SPLITTER_WIDTH / 2;
  const rightPanelWidth = width - rightPanelLeft;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width,
        height,
      }}
    >
      <div
        className="horizontal-splitter-left"
        data-collapsed={collapsed || undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: leftPanelWidth,
          height,
          overflow: "hidden",
        }}
      >
        {!collapsed &&
          React.cloneElement(children[0] as React.ReactElement, {
            width: leftPanelWidth,
            height,
          })}
        <div className="horizontal-splitter-toggle">
          <IconButton
            icon={collapsed ? "side-panel--open" : "side-panel--close"}
            label={collapsed ? "Show overview" : "Hide overview"}
            variant="ghost"
            size="sm"
            tooltipPlacement="right"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>
      </div>
      {!collapsed && (
        <div
          className="horizontal-splitter-handle"
          data-dragging={isDragging || undefined}
          style={{
            position: "absolute",
            left: splitterPosition - SPLITTER_WIDTH / 2,
            top: 0,
            width: SPLITTER_WIDTH,
            height,
          }}
          onMouseDown={handleMouseDown}
        />
      )}
      <div
        style={{
          position: "absolute",
          left: rightPanelLeft,
          top: 0,
          width: rightPanelWidth,
          height,
          overflow: "hidden",
        }}
      >
        {React.cloneElement(children[1] as React.ReactElement, {
          width: rightPanelWidth,
          height,
        })}
      </div>
    </div>
  );
};

export default HorizontalSplitter;
