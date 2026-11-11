import { IconButton } from "../IconButton/IconButton";
import { Select } from "../Select/Select";
import { Spinner } from "../Spinner/Spinner";
import { formatSeconds } from "./timeMath";
import "../base.css";
import "./TimeControls.css";

const SPEEDS = ["0.1", "0.25", "0.5", "1", "2", "4", "8"].map((s) => ({
  value: s,
  label: `${s}×`,
}));

interface PlaybackProps {
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  speed: string;
  onSpeedChange: (speed: string) => void;
  /** The shared cursor, in seconds. */
  time: number;
  /** Replaces the time, such as “Frame 412 of 113,855”. */
  readout?: string;
  /** Playing, but held until the next stretch of data loads. */
  waiting?: boolean;
}

/** Plays the session at a chosen speed, moving the shared cursor. It never starts by itself. */
export function Playback({
  playing,
  onPlayingChange,
  speed,
  onSpeedChange,
  time,
  readout,
  waiting = false,
}: PlaybackProps) {
  return (
    <div className="ns-time-group" role="group" aria-label="Playback">
      <IconButton
        icon={playing ? "pause" : "play"}
        label={playing ? "Pause" : "Play"}
        size="sm"
        shortcut="Space"
        onClick={() => onPlayingChange(!playing)}
      />
      <span className="ns-time-speed">
        <Select
          label="Playback speed"
          hideLabel
          size="sm"
          value={speed}
          options={SPEEDS}
          onChange={onSpeedChange}
        />
      </span>
      <span className="ns-time-divider" />
      <span className="ns-time-value">
        {readout ?? `${formatSeconds(time)} s`}
      </span>
      <span className="ns-time-status" role="status">
        {waiting && (
          <>
            <Spinner />
            Waiting for data
          </>
        )}
      </span>
    </div>
  );
}
