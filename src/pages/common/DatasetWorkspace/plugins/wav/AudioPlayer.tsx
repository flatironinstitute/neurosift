import { useTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useEffect, useRef, useState } from "react";
import { formatSeconds, IconButton } from "@ui";
import "./AudioPlayer.css";

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
}

const AudioPlayer: FunctionComponent<AudioPlayerProps> = ({
  audioUrl,
  duration,
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
    <section className="audio-player" aria-label="Audio player">
      <audio ref={audioRef} src={audioUrl} />
      <IconButton
        icon={isPlaying ? "pause" : "play"}
        label={isPlaying ? "Pause" : "Play"}
        size="sm"
        onClick={handlePlayPause}
      />
      <IconButton
        icon="skip--back"
        label="Back to the start"
        size="sm"
        onClick={handleReset}
      />
      <span className="audio-player-time">
        {formatSeconds(currentTime ?? 0)} s of {formatSeconds(duration)} s
      </span>
    </section>
  );
};

export default AudioPlayer;
