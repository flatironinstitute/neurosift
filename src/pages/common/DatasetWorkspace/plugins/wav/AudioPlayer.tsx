import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { IconButton } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import SkipPreviousIcon from "@mui/icons-material/SkipPrevious";

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  height: number;
}

const AudioPlayer: FunctionComponent<AudioPlayerProps> = ({
  audioUrl,
  duration,
  height,
}) => {
  const { currentTime, setCurrentTime } = useTimeseriesSelection();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync audio current time when timeseriesSelection changes
  useEffect(() => {
    if (!audioRef.current || isPlaying || currentTime === undefined) return;
    if (Math.abs(audioRef.current.currentTime - currentTime) > 0.01) {
      audioRef.current.currentTime = currentTime;
    }
  }, [currentTime, isPlaying]);

  // Update timeseriesSelection as audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (isPlaying) {
        setCurrentTime(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [isPlaying, setCurrentTime]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      // Set current time before playing if timeline position is defined
      if (currentTime !== undefined) {
        audioRef.current.currentTime = currentTime;
      }
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        height,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 10,
        backgroundColor: "#f5f5f5",
        borderBottom: "1px solid #ddd",
      }}
    >
      <audio ref={audioRef} src={audioUrl} />
      <IconButton onClick={handlePlayPause} size="small" sx={{ color: "#666" }}>
        {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
      </IconButton>
      <IconButton onClick={handleReset} size="small" sx={{ color: "#666" }}>
        <SkipPreviousIcon />
      </IconButton>
      <span style={{ fontSize: "12px", color: "#666" }}>
        {currentTime !== undefined
          ? `${Math.floor(currentTime * 10) / 10}s`
          : "0.0s"}{" "}
        / {Math.floor(duration * 10) / 10}s
      </span>
    </div>
  );
};

export default AudioPlayer;
