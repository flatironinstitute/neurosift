import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { IconButton } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

export interface HorizontalSplitterProps {
  width: number;
  height: number;
  initialSplitterPosition: number;
  children: [React.ReactNode, React.ReactNode]; // Exactly two children required
}

const SPLITTER_WIDTH = 8; // Width of the splitter handle area in pixels

const HorizontalSplitter: FunctionComponent<HorizontalSplitterProps> = ({
  width,
  height,
  initialSplitterPosition,
  children,
}) => {
  const [splitterPosition, setSplitterPosition] = useState(
    initialSplitterPosition,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousSplitterPosition = useRef(initialSplitterPosition);

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
    if (!isLeftPanelCollapsed) {
      setSplitterPosition((prev) => Math.max(100, Math.min(width - 100, prev)));
    }
  }, [width, isLeftPanelCollapsed]);

  const toggleLeftPanel = useCallback(() => {
    if (isLeftPanelCollapsed) {
      // Expand the panel to its previous position
      setSplitterPosition(previousSplitterPosition.current);
    } else {
      // Save current position before collapsing
      previousSplitterPosition.current = splitterPosition;
      // Collapse the panel
      setSplitterPosition(0);
    }
    setIsLeftPanelCollapsed(!isLeftPanelCollapsed);
  }, [isLeftPanelCollapsed, splitterPosition]);

  const leftPanelWidth = isLeftPanelCollapsed
    ? 0
    : splitterPosition - SPLITTER_WIDTH / 2;
  const rightPanelWidth =
    width - (isLeftPanelCollapsed ? 0 : splitterPosition) - SPLITTER_WIDTH / 2;

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
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: leftPanelWidth,
          height,
          overflow: "hidden",
          transition: isDragging ? "none" : "width 0.3s ease",
          display: isLeftPanelCollapsed ? "none" : "block",
        }}
      >
        {React.cloneElement(children[0] as React.ReactElement, {
          width: leftPanelWidth,
          height,
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: isLeftPanelCollapsed
            ? 0
            : splitterPosition - SPLITTER_WIDTH / 2,
          top: 0,
          width: SPLITTER_WIDTH,
          height,
          cursor: isLeftPanelCollapsed ? "default" : "col-resize",
          backgroundColor: isDragging ? "#666" : "transparent",
          zIndex: 1000,
          transition: isDragging ? "none" : "left 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseDown={isLeftPanelCollapsed ? undefined : handleMouseDown}
      >
        <div
          style={{
            position: "absolute",
            left: SPLITTER_WIDTH / 2,
            top: 0,
            width: 1,
            height: "100%",
            backgroundColor: "var(--border-subtle)",
            display: isLeftPanelCollapsed ? "none" : "block",
          }}
        />
        {/* Toggle button at the top of the splitter */}
        <IconButton
          onClick={toggleLeftPanel}
          size="small"
          sx={{
            backgroundColor: "var(--action-secondary)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-default)",
            boxShadow: "0 0 4px rgba(0, 0, 0, 0.2)",
            "&:hover": { backgroundColor: "var(--action-secondary-hover)" },
            position: "absolute",
            top: 12,
            left: isLeftPanelCollapsed ? 4 : -16,
            zIndex: 1001,
            width: 28,
            height: 28,
          }}
          title={isLeftPanelCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {isLeftPanelCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </div>
      <div
        style={{
          position: "absolute",
          left: isLeftPanelCollapsed
            ? SPLITTER_WIDTH
            : splitterPosition + SPLITTER_WIDTH / 2,
          top: 0,
          width: rightPanelWidth,
          height,
          overflow: "hidden",
          transition: isDragging ? "none" : "left 0.3s ease, width 0.3s ease",
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
