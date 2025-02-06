import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface HorizontalSplitterProps {
  width: number;
  height: number;
  initialSplitterPosition: number;
  children: [React.ReactNode, React.ReactNode]; // Exactly two children required
}

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

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newPosition = e.clientX;
      // Constrain position to reasonable bounds (minimum 100px from either edge)
      const constrainedPosition = Math.max(
        100,
        Math.min(width - 100, newPosition),
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

  const leftPanelWidth = splitterPosition;
  const rightPanelWidth = width - splitterPosition;

  return (
    <div
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
          left: splitterPosition - 4,
          top: 0,
          width: 8,
          height,
          cursor: "col-resize",
          backgroundColor: isDragging ? "#666" : "transparent",
          zIndex: 1000,
        }}
        onMouseDown={handleMouseDown}
      >
        <div
          style={{
            position: "absolute",
            left: 4,
            top: 0,
            width: 1,
            height: "100%",
            backgroundColor: "#ccc",
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: splitterPosition,
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
