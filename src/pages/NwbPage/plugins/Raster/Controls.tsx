import { FunctionComponent } from "react";
import {
  CondensedLayout,
  ItemRangeControls,
  TimeRangeControls,
} from "../common/components/TimeseriesControls";

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
  startTime,
  endTime,
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
    <CondensedLayout>
      <ItemRangeControls
        visibleStartIndex={visibleUnitsStart}
        numVisibleItems={numVisibleUnits}
        totalNumItems={totalNumUnits}
        itemLabel="Units"
        onDecreaseItems={onDecreaseUnits}
        onIncreaseItems={onIncreaseUnits}
        onShiftItemsLeft={onShiftUnitsLeft}
        onShiftItemsRight={onShiftUnitsRight}
      />
      <TimeRangeControls
        visibleTimeStart={visibleTimeStart}
        visibleDuration={visibleDuration}
        timeseriesStartTime={startTime}
        timeseriesDuration={endTime - startTime}
        onDecreaseVisibleDuration={onDecreaseVisibleDuration}
        onIncreaseVisibleDuration={onIncreaseVisibleDuration}
        onShiftTimeLeft={onShiftTimeLeft}
        onShiftTimeRight={onShiftTimeRight}
      />
    </CondensedLayout>
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
        marginBottom: "0",
        background: "#f5f5f5",
        borderRadius: "5px",
        fontFamily: "sans-serif",
        fontSize: "0.9rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: "8px",
            alignItems: "center",
            padding: "8px 12px",
            fontSize: "0.9rem",
            color: "#212529", // Darker text color
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            whiteSpace: "nowrap",
            width: "auto",
            fontWeight: 500, // Make text slightly bolder
          }}
        >
          <span>
            Start: {startTime.toFixed(2)} s, Duration:{" "}
            {(endTime - startTime).toFixed(2)} s
          </span>
        </div>

        <ItemRangeControls
          visibleStartIndex={visibleUnitsStart}
          numVisibleItems={numVisibleUnits}
          totalNumItems={totalNumUnits}
          itemLabel="Units"
          onDecreaseItems={onDecreaseUnits}
          onIncreaseItems={onIncreaseUnits}
          onShiftItemsLeft={onShiftUnitsLeft}
          onShiftItemsRight={onShiftUnitsRight}
        />

        <TimeRangeControls
          visibleTimeStart={visibleTimeStart}
          visibleDuration={visibleDuration}
          timeseriesStartTime={startTime}
          timeseriesDuration={endTime - startTime}
          onDecreaseVisibleDuration={onDecreaseVisibleDuration}
          onIncreaseVisibleDuration={onIncreaseVisibleDuration}
          onShiftTimeLeft={onShiftTimeLeft}
          onShiftTimeRight={onShiftTimeRight}
          label="Time Window"
        />
      </div>
    </div>
  );
};
