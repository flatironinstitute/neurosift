import { FunctionComponent } from "react";
import { SimpleTimeseriesInfo } from "./types";
import { formatSamplingFrequency } from "./utils";

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
          Start: {info.timeseriesStartTime.toFixed(2)} s, Duration:{" "}
          {info.timeseriesDuration.toFixed(2)} s
        </div>

        <div style={{ fontWeight: "bold" }}>Sampling frequency:</div>
        <div>{formatSamplingFrequency(info.samplingFrequency)}</div>

        {info.totalNumChannels > 1 && (
          <>
            <div style={{ fontWeight: "bold" }}>Channels:</div>
            <div
              style={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>
                Showing {visibleChannelsStart} -{" "}
                {Math.min(
                  visibleChannelsStart + numVisibleChannels,
                  info.totalNumChannels,
                ) - 1}{" "}
                of {info.totalNumChannels}
              </span>
              <ControlButton
                onClick={onDecreaseChannels}
                disabled={numVisibleChannels <= 1}
              >
                /2
              </ControlButton>
              <ControlButton
                onClick={onIncreaseChannels}
                disabled={
                  visibleChannelsStart + numVisibleChannels * 2 >
                  info.totalNumChannels
                }
              >
                ×2
              </ControlButton>
              <ControlButton
                onClick={onShiftChannelsLeft}
                disabled={visibleChannelsStart === 0}
              >
                ←
              </ControlButton>
              <ControlButton
                onClick={onShiftChannelsRight}
                disabled={
                  visibleChannelsStart + numVisibleChannels >=
                  info.totalNumChannels
                }
              >
                →
              </ControlButton>

              {numVisibleChannels > 1 && (
                <>
                  <span
                    style={{ marginLeft: "12px" }}
                    title="Visual separation between channels in units of standard deviations"
                  >
                    Separation: {channelSeparation}
                  </span>
                  <ControlButton
                    onClick={onDecreaseChannelSeparation}
                    disabled={channelSeparation <= 0}
                  >
                    -1
                  </ControlButton>
                  <ControlButton onClick={onIncreaseChannelSeparation}>
                    +1
                  </ControlButton>
                </>
              )}
            </div>
          </>
        )}

        <div style={{ fontWeight: "bold" }}>Samples:</div>
        {visibleTimeStart !== undefined && visibleDuration !== undefined && (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span>
              Showing {visibleDuration.toFixed(2)} sec starting at{" "}
              {visibleTimeStart.toFixed(2)} s
            </span>
            <ControlButton
              onClick={onDecreaseVisibleDuration}
              disabled={visibleDuration <= 0.2}
            >
              /2
            </ControlButton>
            <ControlButton onClick={onIncreaseVisibleDuration}>
              ×2
            </ControlButton>
            <ControlButton
              onClick={onShiftTimeLeft}
              disabled={visibleTimeStart <= info.timeseriesStartTime}
            >
              ←
            </ControlButton>
            <ControlButton
              onClick={onShiftTimeRight}
              disabled={
                visibleTimeStart + visibleDuration >=
                info.timeseriesStartTime + info.timeseriesDuration
              }
            >
              →
            </ControlButton>
          </div>
        )}
      </div>
    </div>
  );
};
