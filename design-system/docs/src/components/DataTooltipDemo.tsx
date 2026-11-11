import { DataTooltip } from "@ui";
import { useState, type KeyboardEvent, type PointerEvent } from "react";

// Illustrative traces, not a recording: four channels over 3 s.
const WIDTH = 480;
const HEIGHT = 160;
const SECONDS = 3;
const wave = (channel: number, t: number) =>
  Math.sin(t * 7 + channel) * 9 + Math.sin(t * 19 + channel * 2) * 4;
const points = (channel: number) =>
  Array.from({ length: 121 }, (_, i) => {
    const t = (i / 120) * SECONDS;
    const y = 20 + channel * 40 + wave(channel, t);
    return `${((i / 120) * WIDTH).toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

/** A stand-in plot: the pointer or the arrow keys move the cursor, and the readout follows. */
export default function DataTooltipDemo() {
  const [cursor, setCursor] = useState<{ x: number; keyboard: boolean } | null>(
    null,
  );
  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * WIDTH;
    setCursor({ x: Math.max(0, Math.min(WIDTH, x)), keyboard: false });
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const step = event.key === "ArrowLeft" ? -8 : 8;
    setCursor((c) => ({
      x: Math.max(0, Math.min(WIDTH, (c?.x ?? WIDTH / 2) + step)),
      keyboard: true,
    }));
  };
  const t = cursor ? (cursor.x / WIDTH) * SECONDS : 0;
  return (
    <div
      className="data-tooltip-demo"
      tabIndex={0}
      role="group"
      aria-label="LFPs, channels 0 to 3, from 0 to 3 s. Use the arrow keys to move the cursor."
      onPointerMove={onMove}
      onPointerLeave={() => setCursor(null)}
      onKeyDown={onKey}
      onBlur={() => setCursor(null)}
    >
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        {[0, 1, 2, 3].map((channel) => (
          <polyline
            key={channel}
            className={`example-plot-line example-plot-series-${channel + 1}`}
            points={points(channel)}
          />
        ))}
        {cursor && (
          <line
            className="data-tooltip-demo-cursor"
            x1={cursor.x}
            x2={cursor.x}
            y1={0}
            y2={HEIGHT}
          />
        )}
      </svg>
      {cursor && (
        <DataTooltip
          time={`${t.toFixed(2)} s`}
          rows={[0, 1, 2, 3].map((channel) => ({
            name: `ch ${channel}`,
            value: `${wave(channel, t).toFixed(1).replace("-", "−")} µV`,
          }))}
          x={cursor.x}
          y={8}
          width={WIDTH}
          announce={cursor.keyboard}
        />
      )}
    </div>
  );
}
