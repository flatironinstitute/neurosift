import { FunctionComponent } from "react";
import {
  CondensedLayout,
  FullLayout,
  ItemRangeControls,
  LabeledRow,
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
    <FullLayout>
      <LabeledRow label="Recording">
        Start: {startTime.toFixed(2)} s, Duration:{" "}
        {(endTime - startTime).toFixed(2)} s
      </LabeledRow>

      <LabeledRow label="Units">
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <ItemRangeControls
            visibleStartIndex={visibleUnitsStart}
            numVisibleItems={numVisibleUnits}
            totalNumItems={totalNumUnits}
            onDecreaseItems={onDecreaseUnits}
            onIncreaseItems={onIncreaseUnits}
            onShiftItemsLeft={onShiftUnitsLeft}
            onShiftItemsRight={onShiftUnitsRight}
          />
        </div>
      </LabeledRow>

      <LabeledRow label="Time Window">
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
      </LabeledRow>

      <LabeledRow label="Block Size">{blockSizeSec} seconds</LabeledRow>
    </FullLayout>
  );
};
