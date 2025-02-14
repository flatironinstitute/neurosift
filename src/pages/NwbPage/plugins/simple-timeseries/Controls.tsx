import { FunctionComponent } from "react";
import {
  CondensedLayout,
  FullLayout,
  ItemRangeControls,
  LabeledRow,
  SeparationControls,
  TimeRangeControls,
} from "../common/components/TimeseriesControls";
import { SimpleTimeseriesInfo } from "./types";
import { formatSamplingFrequency } from "./utils";

type ControlsProps = {
  info: SimpleTimeseriesInfo;
  visibleChannelsStart: number;
  numVisibleChannels: number;
  visibleTimeStart?: number;
  visibleDuration?: number;
  channelSeparation: number;
  onDecreaseChannels: () => void;
  onIncreaseChannels: () => void;
  onShiftChannelsLeft: () => void;
  onShiftChannelsRight: () => void;
  onDecreaseVisibleDuration: () => void;
  onIncreaseVisibleDuration: () => void;
  onShiftTimeLeft: () => void;
  onShiftTimeRight: () => void;
  onDecreaseChannelSeparation: () => void;
  onIncreaseChannelSeparation: () => void;
};

export const CondensedControls: FunctionComponent<ControlsProps> = ({
  info,
  visibleChannelsStart,
  numVisibleChannels,
  visibleTimeStart,
  visibleDuration,
  onDecreaseChannels,
  onIncreaseChannels,
  onShiftChannelsLeft,
  onShiftChannelsRight,
  onDecreaseVisibleDuration,
  onIncreaseVisibleDuration,
  onShiftTimeLeft,
  onShiftTimeRight,
  channelSeparation,
  onDecreaseChannelSeparation,
  onIncreaseChannelSeparation,
}) => {
  return (
    <CondensedLayout>
      {info.totalNumChannels > 1 && (
        <ItemRangeControls
          visibleStartIndex={visibleChannelsStart}
          numVisibleItems={numVisibleChannels}
          totalNumItems={info.totalNumChannels}
          itemLabel="Chans"
          onDecreaseItems={onDecreaseChannels}
          onIncreaseItems={onIncreaseChannels}
          onShiftItemsLeft={onShiftChannelsLeft}
          onShiftItemsRight={onShiftChannelsRight}
        />
      )}
      {info.totalNumChannels > 1 && numVisibleChannels > 1 && (
        <SeparationControls
          channelSeparation={channelSeparation}
          onDecreaseChannelSeparation={onDecreaseChannelSeparation}
          onIncreaseChannelSeparation={onIncreaseChannelSeparation}
        />
      )}
      <TimeRangeControls
        visibleTimeStart={visibleTimeStart}
        visibleDuration={visibleDuration}
        timeseriesStartTime={info.timeseriesStartTime}
        timeseriesDuration={info.timeseriesDuration}
        onDecreaseVisibleDuration={onDecreaseVisibleDuration}
        onIncreaseVisibleDuration={onIncreaseVisibleDuration}
        onShiftTimeLeft={onShiftTimeLeft}
        onShiftTimeRight={onShiftTimeRight}
      />
    </CondensedLayout>
  );
};

export const Controls: FunctionComponent<ControlsProps> = ({
  info,
  visibleChannelsStart,
  numVisibleChannels,
  visibleTimeStart,
  visibleDuration,
  channelSeparation,
  onDecreaseChannels,
  onIncreaseChannels,
  onShiftChannelsLeft,
  onShiftChannelsRight,
  onDecreaseVisibleDuration,
  onIncreaseVisibleDuration,
  onShiftTimeLeft,
  onShiftTimeRight,
  onDecreaseChannelSeparation,
  onIncreaseChannelSeparation,
}) => {
  return (
    <FullLayout>
      <LabeledRow label="Recording">
        Start: {info.timeseriesStartTime.toFixed(2)} s, Duration:{" "}
        {info.timeseriesDuration.toFixed(2)} s
      </LabeledRow>

      <LabeledRow label="Sampling frequency">
        {formatSamplingFrequency(info.samplingFrequency)}
      </LabeledRow>

      {info.totalNumChannels > 1 && (
        <LabeledRow label="Channels">
          <div
            style={{
              display: "flex",
              gap: "6px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ItemRangeControls
              visibleStartIndex={visibleChannelsStart}
              numVisibleItems={numVisibleChannels}
              totalNumItems={info.totalNumChannels}
              onDecreaseItems={onDecreaseChannels}
              onIncreaseItems={onIncreaseChannels}
              onShiftItemsLeft={onShiftChannelsLeft}
              onShiftItemsRight={onShiftChannelsRight}
              itemLabel="Chans"
            />

            {numVisibleChannels > 1 && (
              <SeparationControls
                channelSeparation={channelSeparation}
                onDecreaseChannelSeparation={onDecreaseChannelSeparation}
                onIncreaseChannelSeparation={onIncreaseChannelSeparation}
              />
            )}
          </div>
        </LabeledRow>
      )}

      <LabeledRow label="Samples">
        <TimeRangeControls
          visibleTimeStart={visibleTimeStart}
          visibleDuration={visibleDuration}
          timeseriesStartTime={info.timeseriesStartTime}
          timeseriesDuration={info.timeseriesDuration}
          onDecreaseVisibleDuration={onDecreaseVisibleDuration}
          onIncreaseVisibleDuration={onIncreaseVisibleDuration}
          onShiftTimeLeft={onShiftTimeLeft}
          onShiftTimeRight={onShiftTimeRight}
        />
      </LabeledRow>
    </FullLayout>
  );
};
