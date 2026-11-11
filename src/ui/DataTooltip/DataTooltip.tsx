import { useLayoutEffect, useRef } from "react";
import { swatchClass, type LegendItem } from "../Legend/swatch";
import "../base.css";
import "../Legend/Legend.css";
import "./DataTooltip.css";

interface DataTooltipRow extends LegendItem {
  /** The value with its unit, such as “12.4 µV”. */
  value: string;
}

interface DataTooltipProps {
  /** The time under the cursor, such as “412.38 s”. */
  time: string;
  rows: DataTooltipRow[];
  /** The cursor, in pixels from the plot’s top left. */
  x: number;
  y: number;
  /** The plot’s width, so the readout flips before it reaches the edge. */
  width: number;
  /** Set when the keyboard moved the cursor, so screen readers hear the values. */
  announce?: boolean;
}

/** The values under the cursor on a plot; the chart places it inside a positioned plot area. */
export function DataTooltip({
  time,
  rows,
  x,
  y,
  width,
  announce = false,
}: DataTooltipProps) {
  const tip = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    tip.current?.style.setProperty("--ns-cursor-x", `${x}px`);
    tip.current?.style.setProperty("--ns-cursor-y", `${y}px`);
  }, [x, y]);
  const left = x > width * 0.6;
  return (
    <div
      ref={tip}
      className={
        left ? "ns-data-tooltip ns-data-tooltip--left" : "ns-data-tooltip"
      }
      role={announce ? "status" : undefined}
    >
      <p className="ns-data-tooltip-time">{time}</p>
      {rows.map((row, index) => (
        <p className="ns-data-tooltip-row" key={row.name}>
          <span className={swatchClass(row, index)} aria-hidden="true" />
          <span className="ns-data-tooltip-name">{row.name}</span>
          <span className="ns-data-tooltip-value">{row.value}</span>
        </p>
      ))}
    </div>
  );
}
