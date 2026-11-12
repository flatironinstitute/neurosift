import { useTimeRange } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useCallback } from "react";

export type InteractionMode = "pan" | "select-zoom";

export type CustomToolbarAction = {
  id: string;
  label: string;
  icon?: string;
  onClick?: () => void;
  isActive?: boolean;
  tooltip?: string;
};

type Props = {
  width: number;
  height: number;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  currentTime?: number;
  onZoomToFit?: () => void;
};

const formatTime = (timeSec: number): string => {
  const totalMs = Math.round(timeSec * 1000);
  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);
  const milliseconds = totalMs % 1000;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
};

const TimeScrollToolbar: FunctionComponent<Props> = ({
  width,
  height,
  interactionMode,
  onInteractionModeChange,
  currentTime,
  onZoomToFit,
}) => {
  const { zoomTimeseriesSelection, panTimeseriesSelection } = useTimeRange();

  const handleZoomIn = useCallback(() => {
    zoomTimeseriesSelection("in", 1.2);
  }, [zoomTimeseriesSelection]);

  const handleZoomOut = useCallback(() => {
    zoomTimeseriesSelection("out", 1.2);
  }, [zoomTimeseriesSelection]);

  const handlePanLeft = useCallback(() => {
    panTimeseriesSelection("back", 10);
  }, [panTimeseriesSelection]);

  const handlePanRight = useCallback(() => {
    panTimeseriesSelection("forward", 10);
  }, [panTimeseriesSelection]);

  const handleModeChange = useCallback(
    (mode: InteractionMode) => {
      onInteractionModeChange(mode);
    },
    [onInteractionModeChange],
  );

  return (
    <div
      style={{
        width,
        height,
        backgroundColor: "#f8f9fa",
        borderTop: "1px solid #dee2e6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        fontSize: "13px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Left side - Interaction modes */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <button
          onClick={() => handleModeChange("pan")}
          style={{
            padding: "4px 8px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: interactionMode === "pan" ? "#007bff" : "#ffffff",
            color: interactionMode === "pan" ? "#ffffff" : "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
          }}
          title="Pan mode: Drag to pan, wheel to zoom"
        >
          🖱️ Pan
        </button>
        <button
          onClick={() => handleModeChange("select-zoom")}
          style={{
            padding: "4px 8px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor:
              interactionMode === "select-zoom" ? "#007bff" : "#ffffff",
            color: interactionMode === "select-zoom" ? "#ffffff" : "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
          }}
          title="Select zoom mode: Drag to select region and zoom in"
        >
          🔍 Select
        </button>
      </div>

      {/* Center - Navigation controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <button
          onClick={handlePanLeft}
          style={{
            padding: "6px 10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            color: "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Pan left"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          ⬅️
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            padding: "6px 10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            color: "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Zoom out"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          🔍➖
        </button>
        <button
          onClick={handleZoomIn}
          style={{
            padding: "6px 10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            color: "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Zoom in"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          🔍➕
        </button>
        <button
          onClick={handlePanRight}
          style={{
            padding: "6px 10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            color: "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Pan right"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          ➡️
        </button>
        <div
          style={{
            width: "1px",
            height: "20px",
            backgroundColor: "#dee2e6",
            margin: "0 4px",
          }}
        />
        <button
          onClick={onZoomToFit}
          style={{
            padding: "6px 10px",
            border: "1px solid #ced4da",
            borderRadius: "4px",
            backgroundColor: "#ffffff",
            color: "#495057",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
            transition: "all 0.15s ease",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          title="Reset zoom to show all data"
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#e9ecef";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          🏠
        </button>
      </div>

      {/* Right side - Time display */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#6c757d", fontWeight: "500" }}>Time:</span>
        <span
          style={{
            padding: "4px 8px",
            backgroundColor: "#e9ecef",
            borderRadius: "4px",
            fontFamily: "Monaco, Consolas, monospace",
            fontSize: "12px",
            fontWeight: "600",
            color: "#495057",
            minWidth: "120px",
            textAlign: "center",
          }}
        >
          {currentTime !== undefined ? formatTime(currentTime) : "--:--:--.---"}
        </span>
      </div>
    </div>
  );
};

export default TimeScrollToolbar;
