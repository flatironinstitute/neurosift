import {
  useTimeRange,
  useTimeseriesSelection,
} from "@shared/context-timeseries-selection-2";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import TimeseriesSelectionBar from "./TimeseriesSelectionBar";
import "./TimeseriesSelectionBar.css";

type Props = {
  width: number;
  height: number;
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
    <div className="ts-controls" style={{ width, height }}>
      {/* Editable time fields */}
      <div className="ts-controls-fields">
        {editingDuration ? (
          <input
            ref={durationInputRef}
            type="text"
            value={inputDuration}
            onChange={(e) => setInputDuration(e.target.value)}
            onBlur={handleDurationBlur}
            onKeyDown={handleDurationKeyDown}
            className="ts-controls-input"
          />
        ) : (
          <span
            className="ts-controls-label"
            onClick={handleDurationClick}
            title="Click to edit duration"
          >
            {visibleDuration?.toFixed(2) || "—"}s
          </span>
        )}
        <span className="ts-controls-at">@</span>
        {editingStartTime ? (
          <input
            ref={startTimeInputRef}
            type="text"
            value={inputStartTime}
            onChange={(e) => setInputStartTime(e.target.value)}
            onBlur={handleStartTimeBlur}
            onKeyDown={handleStartTimeKeyDown}
            className="ts-controls-input"
          />
        ) : (
          <span
            className="ts-controls-label"
            onClick={handleStartTimeClick}
            title="Click to edit start time"
          >
            {visibleStartTimeSec?.toFixed(2) || "—"}s
          </span>
        )}
      </div>

      {/* Control buttons */}
      <div className="ts-controls-buttons">
        {/* Zoom buttons */}
        <button
          className="ts-controls-button"
          onClick={() => zoomTimeseriesSelection("in")}
          title="Zoom in (decrease time window)"
        >
          🔍+
        </button>
        <button
          className="ts-controls-button"
          onClick={() => zoomTimeseriesSelection("out")}
          title="Zoom out (increase time window)"
        >
          🔍-
        </button>

        {/* Pan buttons */}
        <button
          className="ts-controls-button"
          onClick={() => canPanLeft && panTimeseriesSelection("back")}
          disabled={!canPanLeft}
          title="Move backward in time"
        >
          ←
        </button>
        <button
          className="ts-controls-button"
          onClick={() => canPanRight && panTimeseriesSelection("forward")}
          disabled={!canPanRight}
          title="Move forward in time"
        >
          →
        </button>
      </div>

      {/* Graphical time bar */}
      <div className="ts-controls-bar" style={{ height }}>
        <TimeseriesSelectionBar width={barWidth} height={height} />
      </div>
    </div>
  );
};

export default TimeseriesSelectionBarWithControls;
