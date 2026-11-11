import {
  ChannelWindow,
  Playback,
  TimeOverview,
  TimeWindow,
  formatSeconds,
  timeKey,
  type ChannelRange,
  type TimeWindowValue,
} from "@ui";
import { useEffect, useState, type KeyboardEvent } from "react";

// The LFP timeseries of Dandiset 000673: 1,375.69 s at 400 Hz, 70 channels.
const SESSION = { start: 0, end: 1375.69 };
const TICK = 100;

/** A plot toolbar wired to one shared view and cursor, with a stand-in plot that takes the keys. */
export default function TimeDemo() {
  const [view, setView] = useState<TimeWindowValue>({
    start: 412,
    duration: 3.75,
  });
  const [channels, setChannels] = useState<ChannelRange>({
    first: 0,
    count: 4,
  });
  const [cursor, setCursor] = useState(413.4);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setCursor((c) =>
        Math.min(SESSION.end, c + (TICK / 1000) * Number(speed)),
      );
    }, TICK);
    return () => clearInterval(timer);
  }, [playing, speed]);

  // Keep the cursor in view while it plays.
  useEffect(() => {
    if (!playing) return;
    if (cursor > view.start + view.duration || cursor < view.start)
      setView((w) => ({
        ...w,
        start: Math.min(
          SESSION.end - w.duration,
          Math.max(0, cursor - w.duration * 0.1),
        ),
      }));
  }, [playing, cursor, view.start, view.duration]);

  const onPlotKey = (event: KeyboardEvent) => {
    if (event.key === " ") {
      event.preventDefault();
      setPlaying((p) => !p);
      return;
    }
    const next = timeKey(event.key, view, SESSION, cursor);
    if (!next) return;
    event.preventDefault();
    setView(next);
  };

  return (
    <div className="time-demo">
      <p className="type-code-sm time-demo-summary">
        0.00–1,375.69 s · 400 Hz · 70 channels
      </p>
      <div className="time-demo-toolbar">
        <TimeWindow
          value={view}
          session={SESSION}
          cursor={cursor}
          onChange={setView}
        />
        <Playback
          playing={playing}
          onPlayingChange={setPlaying}
          speed={speed}
          onSpeedChange={setSpeed}
          time={cursor}
        />
        <ChannelWindow
          label="Channels"
          total={70}
          value={channels}
          onChange={setChannels}
        />
      </div>
      <TimeOverview
        session={SESSION}
        value={view}
        cursor={cursor}
        onChange={setView}
      />
      <div
        className="time-demo-plot"
        role="application"
        aria-label="LFP plot, stand-in"
        aria-roledescription="plot"
        tabIndex={0}
        onKeyDown={onPlotKey}
      >
        <p className="type-body-sm">
          Plot stand-in: {formatSeconds(view.duration)} s from{" "}
          {formatSeconds(view.start)} s, channels {channels.first}–
          {channels.first + channels.count - 1}. Focus here and use = − ← → Home
          End and Space.
        </p>
      </div>
    </div>
  );
}
