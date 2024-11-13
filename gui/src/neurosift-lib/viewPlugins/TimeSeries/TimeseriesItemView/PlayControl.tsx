import { PlayArrow, Stop } from "@mui/icons-material";
import {
  FormControl,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTimeseriesSelection } from "../../../contexts/context-timeseries-selection";

type Props = {
  // none
};

const PlayControl: FunctionComponent<Props> = () => {
  const { currentTime, setCurrentTime } = useTimeseriesSelection();
  const [playing, setPlaying] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const handlePlay = useCallback(() => {
    setPlaying(true);
  }, []);
  const handleStop = useCallback(() => {
    setPlaying(false);
  }, []);
  const currentTimeRef = useRef<number>(currentTime || 0);
  useEffect(() => {
    currentTimeRef.current = currentTime || 0;
  }, [currentTime]);

  useEffect(() => {
    if (!playing) return;
    let canceled = false;
    const startTime = currentTimeRef.current;
    const timer = Date.now();
    let rr = 0;
    const update = () => {
      const elapsed = (Date.now() - timer) / 1000;
      const newTime = startTime + elapsed * playbackRate;
      setCurrentTime(newTime, { autoScrollVisibleTimeRange: true });
      setTimeout(() => {
        // apparently it's important to use a small timeout here so the controls still work (e.g., the slider)
        if (canceled) return;
        rr = requestAnimationFrame(update);
      }, 1);
    };
    rr = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(rr);
      canceled = true;
    };
  }, [playing, setCurrentTime, playbackRate]);

  const disabled = currentTime === undefined;

  return (
    <div>
      {!playing && (
        <IconButton
          title="Play"
          disabled={disabled || playing}
          onClick={handlePlay}
        >
          <PlayArrow />
        </IconButton>
      )}
      {playing && (
        <IconButton
          title="Stop"
          disabled={disabled || !playing}
          onClick={handleStop}
        >
          <Stop />
        </IconButton>
      )}
      <PlaybackRateControl
        disabled={playing || disabled}
        playbackRate={playbackRate}
        setPlaybackRate={setPlaybackRate}
      />
    </div>
  );
};

const PlaybackRateControl: FunctionComponent<{
  playbackRate: number;
  setPlaybackRate: (x: number) => void;
  disabled?: boolean;
}> = ({ playbackRate, setPlaybackRate, disabled }) => {
  const handleChange = useCallback(
    (e: SelectChangeEvent) => {
      setPlaybackRate(parseFloat(e.target.value));
    },
    [setPlaybackRate],
  );
  return (
    <FormControl size="small">
      <Select
        disabled={disabled}
        onChange={handleChange}
        value={playbackRate + ""}
      >
        <MenuItem key={0.1} value={0.1}>
          0.1x
        </MenuItem>
        <MenuItem key={0.25} value={0.25}>
          0.25x
        </MenuItem>
        <MenuItem key={0.5} value={0.5}>
          0.5x
        </MenuItem>
        <MenuItem key={1} value={1}>
          1x
        </MenuItem>
        <MenuItem key={2} value={2}>
          2x
        </MenuItem>
        <MenuItem key={4} value={4}>
          4x
        </MenuItem>
        <MenuItem key={8} value={8}>
          8x
        </MenuItem>
      </Select>
    </FormControl>
  );
};

export default PlayControl;
