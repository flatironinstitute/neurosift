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
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span>
        {visibleDuration.toFixed(2)}s @ {visibleTimeStart.toFixed(2)}s
      </span>
      <ControlButton
        onClick={onDecreaseVisibleDuration}
        disabled={visibleDuration <= minDuration}
      >
        /2
      </ControlButton>
      <ControlButton onClick={onIncreaseVisibleDuration}>×2</ControlButton>
      <ControlButton
        onClick={onShiftTimeLeft}
        disabled={visibleTimeStart <= timeseriesStartTime}
      >
        ←
      </ControlButton>
      <ControlButton
        onClick={onShiftTimeRight}
        disabled={
          visibleTimeStart + visibleDuration >=
          timeseriesStartTime + timeseriesDuration
        }
      >
        →
      </ControlButton>
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
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <span>
        {itemLabel} {visibleStartIndex}-
        {Math.min(visibleStartIndex + numVisibleItems, totalNumItems) - 1}
      </span>
      <ControlButton onClick={onDecreaseItems} disabled={numVisibleItems <= 1}>
        /2
      </ControlButton>
      <ControlButton
        onClick={onIncreaseItems}
        disabled={visibleStartIndex + numVisibleItems >= totalNumItems}
      >
        ×2
      </ControlButton>
      <ControlButton
        onClick={onShiftItemsLeft}
        disabled={visibleStartIndex === 0}
      >
        ←
      </ControlButton>
      <ControlButton
        onClick={onShiftItemsRight}
        disabled={visibleStartIndex + numVisibleItems >= totalNumItems}
      >
        →
      </ControlButton>
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

export const LabeledRow: FunctionComponent<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <>
    <div style={{ fontWeight: "bold" }}>{label}:</div>
    <div>{children}</div>
  </>
);
