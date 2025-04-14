import React, { FunctionComponent } from "react";
import { ControlButton } from "./ControlButton";
import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";

export type TimeRangeControlsProps = {
  visibleTimeStart?: number;
  visibleDuration?: number;
  timeseriesStartTime?: number;
  timeseriesDuration?: number;
  onDecreaseVisibleDuration: () => void;
  onIncreaseVisibleDuration: () => void;
  onShiftTimeLeft: () => void;
  onShiftTimeRight: () => void;
  minDuration?: number;
  label?: string;
};

export const TimeRangeControls: FunctionComponent<TimeRangeControlsProps> = ({
  visibleTimeStart,
  visibleDuration,
  timeseriesStartTime = 0,
  timeseriesDuration = 0,
  onDecreaseVisibleDuration,
  onIncreaseVisibleDuration,
  onShiftTimeLeft,
  onShiftTimeRight,
  minDuration = 0.2,
  label = "Time Window",
}) => {
  const { setVisibleTimeRange } = useTimeseriesSelection();
  const [editingDuration, setEditingDuration] = React.useState(false);
  const [editingStartTime, setEditingStartTime] = React.useState(false);
  const [inputDuration, setInputDuration] = React.useState(
    visibleDuration?.toFixed(2) || "",
  );
  const [inputStartTime, setInputStartTime] = React.useState(
    visibleTimeStart?.toFixed(2) || "",
  );
  const durationInputRef = React.useRef<HTMLInputElement>(null);
  const startTimeInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputDuration(visibleDuration?.toFixed(2) || "");
  }, [visibleDuration]);

  React.useEffect(() => {
    setInputStartTime(visibleTimeStart?.toFixed(2) || "");
  }, [visibleTimeStart]);

  if (visibleTimeStart === undefined || visibleDuration === undefined)
    return null;

  const handleDurationClick = () => {
    setEditingDuration(true);
    // Focus the input after rendering
    setTimeout(() => durationInputRef.current?.focus(), 0);
  };

  const handleStartTimeClick = () => {
    setEditingStartTime(true);
    // Focus the input after rendering
    setTimeout(() => startTimeInputRef.current?.focus(), 0);
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
      setInputDuration(visibleDuration.toFixed(2));
    }
  };

  const handleStartTimeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setEditingStartTime(false);
      applyStartTimeChange();
    } else if (e.key === "Escape") {
      setEditingStartTime(false);
      setInputStartTime(visibleTimeStart.toFixed(2));
    }
  };

  const applyDurationChange = () => {
    const newDuration = parseFloat(inputDuration);
    if (isNaN(newDuration) || newDuration < minDuration) {
      // Reset to current value if invalid
      setInputDuration(visibleDuration.toFixed(2));
      return;
    }

    // Use the timeseriesSelection context for precise control when possible
    if (setVisibleTimeRange) {
      const newEndTime = visibleTimeStart + newDuration;
      setVisibleTimeRange(visibleTimeStart, newEndTime);
      return;
    }

    // Fallback to the old implementation if setVisibleTimeRange is not available
    const ratio = newDuration / visibleDuration;
    if (ratio > 1) {
      // Zoom out (increase visible duration)
      for (let i = 0; i < Math.log2(ratio); i++) {
        onIncreaseVisibleDuration();
      }
    } else {
      // Zoom in (decrease visible duration)
      for (let i = 0; i < Math.log2(1 / ratio); i++) {
        onDecreaseVisibleDuration();
      }
    }
  };

  const applyStartTimeChange = () => {
    const newStartTime = parseFloat(inputStartTime);
    if (
      isNaN(newStartTime) ||
      newStartTime < timeseriesStartTime ||
      newStartTime > timeseriesStartTime + timeseriesDuration - visibleDuration
    ) {
      // Reset to current value if invalid
      setInputStartTime(visibleTimeStart.toFixed(2));
      return;
    }

    // Use the timeseriesSelection context for precise control when possible
    if (setVisibleTimeRange) {
      const newEndTime = newStartTime + visibleDuration;
      setVisibleTimeRange(newStartTime, newEndTime);
      return;
    }

    // Fallback to the old implementation if setVisibleTimeRange is not available
    const difference = newStartTime - visibleTimeStart;
    const shiftAmount = difference / visibleDuration;

    if (difference > 0) {
      // Shift right
      for (let i = 0; i < Math.ceil(shiftAmount * 2); i++) {
        onShiftTimeRight();
      }
    } else if (difference < 0) {
      // Shift left
      for (let i = 0; i < Math.ceil(Math.abs(shiftAmount) * 2); i++) {
        onShiftTimeLeft();
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        background: "#f8f9fa",
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "0.9rem",
          color: "#495057",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: "130px",
        }}
      >
        <span style={{ fontWeight: 500 }}>{label}</span>
        {editingDuration ? (
          <input
            ref={durationInputRef}
            type="text"
            value={inputDuration}
            onChange={(e) => setInputDuration(e.target.value)}
            onBlur={handleDurationBlur}
            onKeyDown={handleDurationKeyDown}
            style={{
              width: "60px",
              padding: "2px 4px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "0.9rem",
              marginLeft: "8px",
            }}
          />
        ) : (
          <span
            style={{
              color: "#868e96",
              marginLeft: "8px",
              cursor: "pointer",
              textDecoration: "underline dashed",
              textDecorationColor: "#adb5bd",
              textUnderlineOffset: "2px",
            }}
            onClick={handleDurationClick}
            title="Click to edit duration"
          >
            {visibleDuration.toFixed(2)}s
          </span>
        )}
        <span style={{ color: "#868e96" }}>at</span>
        {editingStartTime ? (
          <input
            ref={startTimeInputRef}
            type="text"
            value={inputStartTime}
            onChange={(e) => setInputStartTime(e.target.value)}
            onBlur={handleStartTimeBlur}
            onKeyDown={handleStartTimeKeyDown}
            style={{
              width: "60px",
              padding: "2px 4px",
              border: "1px solid #ced4da",
              borderRadius: "4px",
              fontSize: "0.9rem",
            }}
          />
        ) : (
          <span
            style={{
              fontWeight: 500,
              cursor: "pointer",
              textDecoration: "underline dashed",
              textDecorationColor: "#adb5bd",
              textUnderlineOffset: "2px",
            }}
            onClick={handleStartTimeClick}
            title="Click to edit start time"
          >
            {visibleTimeStart.toFixed(2)}s
          </span>
        )}
      </div>
      <div style={{ marginLeft: "4px", display: "flex", gap: "4px" }}>
        <ControlButton
          onClick={onDecreaseVisibleDuration}
          disabled={visibleDuration <= minDuration}
          title="Zoom in (decrease time window)"
        >
          🔍+
        </ControlButton>
        <ControlButton
          onClick={onIncreaseVisibleDuration}
          title="Zoom out (increase time window)"
        >
          🔍-
        </ControlButton>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <ControlButton
          onClick={onShiftTimeLeft}
          disabled={visibleTimeStart <= timeseriesStartTime}
          title="Move backward in time"
        >
          ←
        </ControlButton>
        <ControlButton
          onClick={onShiftTimeRight}
          disabled={
            visibleTimeStart + visibleDuration >=
            timeseriesStartTime + timeseriesDuration
          }
          title="Move forward in time"
        >
          →
        </ControlButton>
      </div>
    </div>
  );
};

export type ItemRangeControlsProps = {
  visibleStartIndex: number;
  numVisibleItems: number;
  totalNumItems: number;
  itemLabel?: string;
  onDecreaseItems: () => void;
  onIncreaseItems: () => void;
  onShiftItemsLeft: () => void;
  onShiftItemsRight: () => void;
};

export const ItemRangeControls: FunctionComponent<ItemRangeControlsProps> = ({
  visibleStartIndex,
  numVisibleItems,
  totalNumItems,
  itemLabel = "",
  onDecreaseItems,
  onIncreaseItems,
  onShiftItemsLeft,
  onShiftItemsRight,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        background: "#f8f9fa",
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "0.9rem",
          color: "#495057",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          minWidth: "70px",
        }}
      >
        {itemLabel && <span style={{ fontWeight: 500 }}>{itemLabel}</span>}
        <span style={{ color: "#868e96" }}>
          {visibleStartIndex}-
          {Math.min(visibleStartIndex + numVisibleItems, totalNumItems) - 1} of{" "}
          {totalNumItems}
        </span>
      </div>
      <div style={{ marginLeft: "4px", display: "flex", gap: "4px" }}>
        <ControlButton
          onClick={onDecreaseItems}
          disabled={numVisibleItems <= 1}
          title="Show fewer items"
        >
          －
        </ControlButton>
        <ControlButton
          onClick={onIncreaseItems}
          disabled={visibleStartIndex + numVisibleItems >= totalNumItems}
          title="Show more items"
        >
          ＋
        </ControlButton>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <ControlButton
          onClick={onShiftItemsLeft}
          disabled={visibleStartIndex === 0}
          title="Move to previous items"
        >
          ↓
        </ControlButton>
        <ControlButton
          onClick={onShiftItemsRight}
          disabled={visibleStartIndex + numVisibleItems >= totalNumItems}
          title="Move to next items"
        >
          ↑
        </ControlButton>
      </div>
    </div>
  );
};

export const CondensedLayout: FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => (
  <div
    style={{
      padding: "6px",
      background: "#f5f5f5",
      borderRadius: "5px",
      fontFamily: "sans-serif",
      fontSize: "0.9rem",
      display: "flex",
      gap: "16px",
      alignItems: "center",
    }}
  >
    {children}
  </div>
);

export const FullLayout: FunctionComponent<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Convert children to array to group them
  const childrenArray = React.Children.toArray(children);
  const recordingInfo = childrenArray[0]; // Recording info row
  const controls = childrenArray.slice(1); // The rest are control groups

  return (
    <div
      style={{
        padding: "10px",
        background: "#f5f5f5",
        borderRadius: "5px",
        fontFamily: "sans-serif",
        fontSize: "0.9rem",
      }}
    >
      <div style={{ marginBottom: "12px" }}>{recordingInfo}</div>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
          overflowX: "auto",
        }}
      >
        {controls}
      </div>
    </div>
  );
};

export type SeparationControlsProps = {
  channelSeparation: number;
  onDecreaseChannelSeparation: () => void;
  onIncreaseChannelSeparation: () => void;
};

export const SeparationControls: FunctionComponent<SeparationControlsProps> = ({
  channelSeparation,
  onDecreaseChannelSeparation,
  onIncreaseChannelSeparation,
}) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        alignItems: "center",
        background: "#f8f9fa",
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #e9ecef",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          fontSize: "0.9rem",
          color: "#495057",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          minWidth: "70px",
        }}
      >
        <span style={{ fontWeight: 500 }}>Separation</span>
        <span style={{ color: "#868e96" }}>{channelSeparation}</span>
      </div>
      <div style={{ display: "flex", gap: "4px" }}>
        <ControlButton
          onClick={onDecreaseChannelSeparation}
          disabled={channelSeparation <= 0}
          title="Decrease channel separation"
        >
          －
        </ControlButton>
        <ControlButton
          onClick={onIncreaseChannelSeparation}
          title="Increase channel separation"
        >
          ＋
        </ControlButton>
      </div>
    </div>
  );
};

export const LabeledRow: FunctionComponent<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <>
    <div style={{ fontWeight: "bold" }}>{label && `${label}:`}</div>
    <div>{children}</div>
  </>
);
