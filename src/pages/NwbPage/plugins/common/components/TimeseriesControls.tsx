import { FunctionComponent } from "react";
import { ControlButton } from "./ControlButton";

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
}) => {
  if (visibleTimeStart === undefined || visibleDuration === undefined)
    return null;

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
          minWidth: "110px",
        }}
      >
        <span style={{ fontWeight: 500 }}>{visibleDuration.toFixed(2)}s</span>
        <span style={{ color: "#868e96" }}>at</span>
        <span style={{ fontWeight: 500 }}>{visibleTimeStart.toFixed(2)}s</span>
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
          ⟵
        </ControlButton>
        <ControlButton
          onClick={onShiftTimeRight}
          disabled={
            visibleTimeStart + visibleDuration >=
            timeseriesStartTime + timeseriesDuration
          }
          title="Move forward in time"
        >
          ⟶
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
  itemLabel = "Items",
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
          gap: "4px",
          minWidth: "70px",
        }}
      >
        <span style={{ fontWeight: 500 }}>{itemLabel}</span>
        <span style={{ color: "#868e96" }}>
          {visibleStartIndex}-
          {Math.min(visibleStartIndex + numVisibleItems, totalNumItems) - 1}
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
          ⟵
        </ControlButton>
        <ControlButton
          onClick={onShiftItemsRight}
          disabled={visibleStartIndex + numVisibleItems >= totalNumItems}
          title="Move to next items"
        >
          ⟶
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
      marginBottom: "10px",
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
}> = ({ children }) => (
  <div
    style={{
      padding: "10px",
      marginBottom: "15px",
      background: "#f5f5f5",
      borderRadius: "5px",
      fontFamily: "sans-serif",
      fontSize: "0.9rem",
    }}
  >
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: "4px 12px",
        alignItems: "baseline",
      }}
    >
      {children}
    </div>
  </div>
);

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
    <div style={{ fontWeight: "bold" }}>{label}:</div>
    <div>{children}</div>
  </>
);
