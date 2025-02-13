import { FunctionComponent } from "react";

type ControlButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
};

const ControlButton: FunctionComponent<ControlButtonProps> = ({
  onClick,
  disabled = false,
  children,
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "2px 6px",
      border: "1px solid #ccc",
      borderRadius: "2px",
      fontSize: "0.85rem",
      backgroundColor: disabled ? "#f5f5f5" : "white",
      cursor: disabled ? "default" : "pointer",
    }}
  >
    {children}
  </button>
);

type ControlsProps = {
  startTime: number;
  endTime: number;
  visibleUnitsStart: number;
  numVisibleUnits: number;
  totalNumUnits: number;
  visibleTimeStart?: number;
  visibleDuration?: number;
  blockSizeSec: number;
  onDecreaseUnits: () => void;
  onIncreaseUnits: () => void;
  onShiftUnitsLeft: () => void;
  onShiftUnitsRight: () => void;
  onDecreaseVisibleDuration: () => void;
  onIncreaseVisibleDuration: () => void;
  onShiftTimeLeft: () => void;
  onShiftTimeRight: () => void;
};

export const CondensedControls: FunctionComponent<ControlsProps> = ({
  visibleUnitsStart,
  numVisibleUnits,
  totalNumUnits,
  visibleTimeStart,
  visibleDuration,
  onDecreaseUnits,
  onIncreaseUnits,
  onShiftUnitsLeft,
  onShiftUnitsRight,
  onDecreaseVisibleDuration,
  onIncreaseVisibleDuration,
  onShiftTimeLeft,
  onShiftTimeRight,
}) => {
  return (
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
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <span style={{ fontSize: "0.85rem" }}>
          Units {visibleUnitsStart}-
          {Math.min(visibleUnitsStart + numVisibleUnits, totalNumUnits) - 1}
        </span>
        <ControlButton
          onClick={onDecreaseUnits}
          disabled={numVisibleUnits <= 1}
        >
          /2
        </ControlButton>
        <ControlButton
          onClick={onIncreaseUnits}
          disabled={visibleUnitsStart + numVisibleUnits >= totalNumUnits}
        >
          ×2
        </ControlButton>
        <ControlButton
          onClick={onShiftUnitsLeft}
          disabled={visibleUnitsStart === 0}
        >
          ←
        </ControlButton>
        <ControlButton
          onClick={onShiftUnitsRight}
          disabled={visibleUnitsStart + numVisibleUnits >= totalNumUnits}
        >
          →
        </ControlButton>
      </div>

      {visibleTimeStart !== undefined && visibleDuration !== undefined && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span style={{ fontSize: "0.85rem" }}>
            {visibleDuration.toFixed(2)}s @ {visibleTimeStart.toFixed(2)}s
          </span>
          <ControlButton onClick={onDecreaseVisibleDuration}>/2</ControlButton>
          <ControlButton onClick={onIncreaseVisibleDuration}>×2</ControlButton>
          <ControlButton onClick={onShiftTimeLeft}>←</ControlButton>
          <ControlButton onClick={onShiftTimeRight}>→</ControlButton>
        </div>
      )}
    </div>
  );
};

export const Controls: FunctionComponent<ControlsProps> = ({
  startTime,
  endTime,
  visibleUnitsStart,
  numVisibleUnits,
  totalNumUnits,
  visibleTimeStart,
  visibleDuration,
  blockSizeSec,
  onDecreaseUnits,
  onIncreaseUnits,
  onShiftUnitsLeft,
  onShiftUnitsRight,
  onDecreaseVisibleDuration,
  onIncreaseVisibleDuration,
  onShiftTimeLeft,
  onShiftTimeRight,
}) => {
  return (
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
        <div style={{ fontWeight: "bold" }}>Recording:</div>
        <div>
          Start: {startTime.toFixed(2)} s, Duration:{" "}
          {(endTime - startTime).toFixed(2)} s
        </div>

        <div style={{ fontWeight: "bold" }}>Units:</div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <span>
            Showing {visibleUnitsStart} -{" "}
            {Math.min(visibleUnitsStart + numVisibleUnits, totalNumUnits) - 1}{" "}
            of {totalNumUnits}
          </span>
          <ControlButton
            onClick={onDecreaseUnits}
            disabled={numVisibleUnits <= 1}
          >
            /2
          </ControlButton>
          <ControlButton
            onClick={onIncreaseUnits}
            disabled={visibleUnitsStart + numVisibleUnits >= totalNumUnits}
          >
            ×2
          </ControlButton>
          <ControlButton
            onClick={onShiftUnitsLeft}
            disabled={visibleUnitsStart === 0}
          >
            ←
          </ControlButton>
          <ControlButton
            onClick={onShiftUnitsRight}
            disabled={visibleUnitsStart + numVisibleUnits >= totalNumUnits}
          >
            →
          </ControlButton>
        </div>

        <div style={{ fontWeight: "bold" }}>Time Window:</div>
        {visibleTimeStart !== undefined && visibleDuration !== undefined && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {visibleDuration.toFixed(1)} sec starting at{" "}
              {visibleTimeStart.toFixed(1)} sec
            </span>
            <ControlButton onClick={onDecreaseVisibleDuration}>
              /2
            </ControlButton>
            <ControlButton onClick={onIncreaseVisibleDuration}>
              ×2
            </ControlButton>
            <ControlButton onClick={onShiftTimeLeft}>←</ControlButton>
            <ControlButton onClick={onShiftTimeRight}>→</ControlButton>
          </div>
        )}

        <div style={{ fontWeight: "bold" }}>Block Size:</div>
        <div>{blockSizeSec} seconds</div>
      </div>
    </div>
  );
};
