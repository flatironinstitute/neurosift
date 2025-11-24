import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import TimeseriesSelectionBar from "./TimeseriesSelectionBar";

type Props = {
  width: number;
  height: number;
};

const inputStyle: React.CSSProperties = {
  width: "50px",
  padding: "1px 3px",
  border: "1px solid #ced4da",
  borderRadius: "3px",
  fontSize: "0.7rem",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  color: "#495057",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  cursor: "pointer",
  textDecoration: "underline dashed",
  textDecorationColor: "#adb5bd",
  textUnderlineOffset: "2px",
};

const buttonStyle: React.CSSProperties = {
  padding: "0px 4px",
  border: "1px solid #ddd",
  borderRadius: "3px",
  fontSize: "0.75rem",
  backgroundColor: "white",
  cursor: "pointer",
  color: "#333",
  transition: "all 0.2s ease",
  boxShadow: "0 1px 1px rgba(0,0,0,0.05)",
  outline: "none",
  minWidth: "22px",
  height: "18px",
  lineHeight: "1",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  userSelect: "none",
};

const disabledButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: "#f5f5f5",
  cursor: "not-allowed",
  color: "#999",
  boxShadow: "none",
};

const controlsWidth = 260;

const TimeseriesSelectionBarWithControls: FunctionComponent<Props> = ({
  width,
  height,
}) => {
  const {
    zoomTimeseriesSelection,
    panTimeseriesSelection,
    setVisibleTimeRange,
  } = useTimeRange();
  const { timeseriesSelection } = useTimeseriesSelection();
  const {
    startTimeSec: timeseriesStartTimeSec,
    endTimeSec: timeseriesEndTimeSec,
    visibleStartTimeSec,
    visibleEndTimeSec,
  } = timeseriesSelection;

  const visibleDuration =
    visibleStartTimeSec !== undefined && visibleEndTimeSec !== undefined
      ? visibleEndTimeSec - visibleStartTimeSec
      : undefined;

  // Editable fields state
  const [editingDuration, setEditingDuration] = useState(false);
  const [editingStartTime, setEditingStartTime] = useState(false);
  const [inputDuration, setInputDuration] = useState(
    visibleDuration?.toFixed(2) || "",
  );
  const [inputStartTime, setInputStartTime] = useState(
    visibleStartTimeSec?.toFixed(2) || "",
  );
  const durationInputRef = useRef<HTMLInputElement>(null);
  const startTimeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputDuration(visibleDuration?.toFixed(2) || "");
  }, [visibleDuration]);

  useEffect(() => {
    setInputStartTime(visibleStartTimeSec?.toFixed(2) || "");
  }, [visibleStartTimeSec]);

  const handleDurationClick = () => {
    setEditingDuration(true);
    setTimeout(() => durationInputRef.current?.focus(), 0);
  };

  const handleStartTimeClick = () => {
    setEditingStartTime(true);
    setTimeout(() => startTimeInputRef.current?.focus(), 0);
  };

  const applyDurationChange = () => {
    const newDuration = parseFloat(inputDuration);
    if (
      isNaN(newDuration) ||
      newDuration < 0.01 ||
      visibleStartTimeSec === undefined
    ) {
      setInputDuration(visibleDuration?.toFixed(2) || "");
      return;
    }
    const newEndTime = visibleStartTimeSec + newDuration;
    setVisibleTimeRange(visibleStartTimeSec, newEndTime);
  };

  const applyStartTimeChange = () => {
    const newStartTime = parseFloat(inputStartTime);
    if (
      isNaN(newStartTime) ||
      visibleDuration === undefined ||
      timeseriesStartTimeSec === undefined ||
      timeseriesEndTimeSec === undefined ||
      newStartTime < timeseriesStartTimeSec ||
      newStartTime > timeseriesEndTimeSec - visibleDuration
    ) {
      setInputStartTime(visibleStartTimeSec?.toFixed(2) || "");
      return;
    }
    const newEndTime = newStartTime + visibleDuration;
    setVisibleTimeRange(newStartTime, newEndTime);
  };

  const handleDurationBlur = () => {
    setEditingDuration(false);
    applyDurationChange();
  };

  const handleStartTimeBlur = () => {
    setEditingStartTime(false);
    applyStartTimeChange();
  };

  const handleDurationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditingDuration(false);
      applyDurationChange();
    } else if (e.key === "Escape") {
      setEditingDuration(false);
      setInputDuration(visibleDuration?.toFixed(2) || "");
    }
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditingStartTime(false);
      applyStartTimeChange();
    } else if (e.key === "Escape") {
      setEditingStartTime(false);
      setInputStartTime(visibleStartTimeSec?.toFixed(2) || "");
    }
  };

  const canPanLeft =
    visibleStartTimeSec !== undefined &&
    timeseriesStartTimeSec !== undefined &&
    visibleStartTimeSec > timeseriesStartTimeSec;

  const canPanRight =
    visibleEndTimeSec !== undefined &&
    timeseriesEndTimeSec !== undefined &&
    visibleEndTimeSec < timeseriesEndTimeSec;

  const barWidth = width - controlsWidth;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        width,
        height,
        backgroundColor: "white",
        gap: "4px",
      }}
    >
      {/* Editable time fields */}
      <div
        style={{
          display: "flex",
          gap: "3px",
          alignItems: "center",
          paddingLeft: "4px",
          flexShrink: 0,
          fontSize: "0.7rem",
          color: "#495057",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {editingDuration ? (
          <input
            ref={durationInputRef}
            type="text"
            value={inputDuration}
            onChange={(e) => setInputDuration(e.target.value)}
            onBlur={handleDurationBlur}
            onKeyDown={handleDurationKeyDown}
            style={inputStyle}
          />
        ) : (
          <span
            style={labelStyle}
            onClick={handleDurationClick}
            title="Click to edit duration"
          >
            {visibleDuration?.toFixed(2) || "—"}s
          </span>
        )}
        <span style={{ color: "#868e96" }}>@</span>
        {editingStartTime ? (
          <input
            ref={startTimeInputRef}
            type="text"
            value={inputStartTime}
            onChange={(e) => setInputStartTime(e.target.value)}
            onBlur={handleStartTimeBlur}
            onKeyDown={handleStartTimeKeyDown}
            style={inputStyle}
          />
        ) : (
          <span
            style={labelStyle}
            onClick={handleStartTimeClick}
            title="Click to edit start time"
          >
            {visibleStartTimeSec?.toFixed(2) || "—"}s
          </span>
        )}
      </div>

      {/* Control buttons */}
      <div
        style={{
          display: "flex",
          gap: "2px",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        {/* Zoom buttons */}
        <button
          style={buttonStyle}
          onClick={() => zoomTimeseriesSelection("in")}
          title="Zoom in (decrease time window)"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8f8f8";
            e.currentTarget.style.borderColor = "#ccc";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#ddd";
          }}
        >
          🔍+
        </button>
        <button
          style={buttonStyle}
          onClick={() => zoomTimeseriesSelection("out")}
          title="Zoom out (increase time window)"
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#f8f8f8";
            e.currentTarget.style.borderColor = "#ccc";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "white";
            e.currentTarget.style.borderColor = "#ddd";
          }}
        >
          🔍-
        </button>

        {/* Pan buttons */}
        <button
          style={canPanLeft ? buttonStyle : disabledButtonStyle}
          onClick={() => canPanLeft && panTimeseriesSelection("back")}
          disabled={!canPanLeft}
          title="Move backward in time"
          onMouseOver={(e) => {
            if (canPanLeft) {
              e.currentTarget.style.backgroundColor = "#f8f8f8";
              e.currentTarget.style.borderColor = "#ccc";
            }
          }}
          onMouseOut={(e) => {
            if (canPanLeft) {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#ddd";
            }
          }}
        >
          ←
        </button>
        <button
          style={canPanRight ? buttonStyle : disabledButtonStyle}
          onClick={() => canPanRight && panTimeseriesSelection("forward")}
          disabled={!canPanRight}
          title="Move forward in time"
          onMouseOver={(e) => {
            if (canPanRight) {
              e.currentTarget.style.backgroundColor = "#f8f8f8";
              e.currentTarget.style.borderColor = "#ccc";
            }
          }}
          onMouseOut={(e) => {
            if (canPanRight) {
              e.currentTarget.style.backgroundColor = "white";
              e.currentTarget.style.borderColor = "#ddd";
            }
          }}
        >
          →
        </button>
      </div>

      {/* Graphical time bar */}
      <div
        style={{
          position: "relative",
          flex: 1,
          height: height,
        }}
      >
        <TimeseriesSelectionBar width={barWidth} height={height} />
      </div>
    </div>
  );
};

export default TimeseriesSelectionBarWithControls;
