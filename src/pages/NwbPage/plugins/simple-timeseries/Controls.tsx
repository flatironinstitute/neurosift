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
          itemLabel="Channels"
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
      <LabeledRow label="">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            Start: {info.timeseriesStartTime.toFixed(2)} s, Duration: {info.timeseriesDuration.toFixed(2)} s, {formatSamplingFrequency(info.samplingFrequency)}
          </div>
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
            {info.totalNumChannels > 1 && (
              <>
                <ItemRangeControls
                  visibleStartIndex={visibleChannelsStart}
                  numVisibleItems={numVisibleChannels}
                  totalNumItems={info.totalNumChannels}
                  onDecreaseItems={onDecreaseChannels}
                  onIncreaseItems={onIncreaseChannels}
                  onShiftItemsLeft={onShiftChannelsLeft}
                  onShiftItemsRight={onShiftChannelsRight}
                  itemLabel="Channels"
                />
                {numVisibleChannels > 1 && (
                  <SeparationControls
                    channelSeparation={channelSeparation}
                    onDecreaseChannelSeparation={onDecreaseChannelSeparation}
                    onIncreaseChannelSeparation={onIncreaseChannelSeparation}
                  />
                )}
              </>
            )}
        </div>
      </LabeledRow>
    </FullLayout>
  );
};
