import { Playback, TimeOverview, TimeWindow, ViewPanel } from "@ui";
import { FunctionComponent, ReactNode, useEffect } from "react";
import type { WindowPlayback } from "./usePlayback";
import { useTimeWindow } from "./useTimeWindow";
import "./TimeView.css";

/** Height the frame takes above the chart: summary, controls and overview. */
export const TIME_VIEW_CHROME = 150;
/** Width the frame takes beside the chart: padding and the plot's border. */
export const TIME_VIEW_INSET = 34;
/** The 320px settings panel and the gap before it. */
export const TIME_VIEW_SETTINGS = 336;
export const TIME_VIEW_TITLE = 32;

type Props = {
  label: string;
  summary: string;
  /** The view's own options, after the time window. */
  controls?: ReactNode;
  settings?: ReactNode;
  chartTitle?: string;
  busy?: boolean;
  /** Small views in a combined tab leave out the overview. */
  condensed?: boolean;
  /** Views that opt in play the shared window forward. */
  playback?: WindowPlayback;
  /** The data for the window shown hasn't arrived, so playback holds. */
  holding?: boolean;
  children: ReactNode;
};

/** A view on recording time: the shared time window and overview around Neurosift's chart. */
const TimeView: FunctionComponent<Props> = ({
  label,
  summary,
  controls,
  settings,
  chartTitle,
  busy,
  condensed,
  playback,
  holding = false,
  children,
}) => {
  const time = useTimeWindow();
  const hold = playback?.hold;
  useEffect(() => hold?.(holding), [hold, holding]);
  return (
    <ViewPanel
      label={label}
      summary={summary}
      busy={busy}
      settings={settings}
      chartTitle={chartTitle}
      controls={
        <>
          <TimeWindow
            value={time.value}
            session={time.session}
            cursor={time.cursor}
            onChange={time.onChange}
          />
          {playback && (
            <Playback
              playing={playback.playing}
              onPlayingChange={playback.setPlaying}
              speed={playback.speed}
              onSpeedChange={playback.setSpeed}
              time={playback.time}
              waiting={playback.waiting}
            />
          )}
          {controls}
        </>
      }
      overview={
        condensed ? undefined : (
          <TimeOverview
            session={time.session}
            value={time.value}
            cursor={time.cursor}
            onChange={time.onChange}
          />
        )
      }
    >
      {playback ? (
        <div
          className="time-view-plot"
          tabIndex={0}
          aria-label={`${chartTitle ?? label}. Space plays and pauses.`}
          onKeyDown={playback.onKeyDown}
        >
          {children}
        </div>
      ) : (
        children
      )}
    </ViewPanel>
  );
};

export default TimeView;
