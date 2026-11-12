import { useCssVars } from "@components/useCssVars";
import { TimeAxisContext } from "@shared/context-timeseries-selection-2";
import {
  DataTooltip,
  Playback,
  SegmentedControl,
  TimeOverview,
  TimeWindow,
  ViewPanel,
} from "@ui";
import { FunctionComponent, ReactNode, useEffect } from "react";
import { selectionLabel, type DragMode } from "./timeSelect";
import type { WindowPlayback } from "./usePlayback";
import { useTimeSelect, type Selection } from "./useTimeSelect";
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

const DRAG_OPTIONS = [
  { value: "pan", label: "Pan", icon: "pan--horizontal" as const },
  { value: "select", label: "Select", icon: "zoom--area" as const },
];

/** The stretch being dragged across: a shaded band and its range. */
const SelectionBand = ({ selection }: { selection: Selection }) => {
  const ref = useCssVars<HTMLDivElement>({
    "--select-left": selection.left,
    "--select-top": selection.top,
    "--select-width": selection.width,
    "--select-height": selection.height,
  });
  const label = selection.value && selectionLabel(selection.value);
  return (
    <>
      <div ref={ref} className="time-view-select-band" aria-hidden="true" />
      {label && (
        <DataTooltip
          time={label.range}
          rows={[{ name: "Length", value: label.length }]}
          x={selection.left + selection.width}
          y={selection.top + 8}
          width={selection.frameWidth}
        />
      )}
    </>
  );
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
  const select = useTimeSelect(() => {
    if (playback?.playing) playback.setPlaying(false);
  });
  const title = chartTitle ?? label;
  const plotLabel = [
    `${title}.`,
    select.available &&
      "Drag across the plot in Select mode, or Shift+drag, to zoom to that stretch of time.",
    playback && "Space plays and pauses.",
  ]
    .filter(Boolean)
    .join(" ");
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
          {select.available && (
            <SegmentedControl
              label="Drag to"
              size="sm"
              value={select.mode}
              onChange={(v) => select.setMode(v as DragMode)}
              options={DRAG_OPTIONS}
            />
          )}
          {playback && (
            <Playback
              playing={playback.playing}
              onPlayingChange={playback.setPlaying}
              speed={playback.speed}
              onSpeedChange={playback.setSpeed}
              time={playback.time}
              waiting={playback.waiting}
              disabledReason={playback.disabledReason}
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
      <TimeAxisContext.Provider value={select.register}>
        <div
          className={
            select.available
              ? `time-view-plot time-view-plot--${select.cursorMode}`
              : "time-view-plot"
          }
          role={playback || select.available ? "group" : undefined}
          tabIndex={playback ? 0 : undefined}
          aria-label={playback || select.available ? plotLabel : undefined}
          onKeyDown={playback?.onKeyDown}
          {...select.handlers}
        >
          {children}
          {select.selection && <SelectionBand selection={select.selection} />}
        </div>
      </TimeAxisContext.Provider>
    </ViewPanel>
  );
};

export default TimeView;
