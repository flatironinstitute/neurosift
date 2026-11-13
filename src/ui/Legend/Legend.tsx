import "../base.css";
import "./Legend.css";
import { swatchClass, type LegendItem } from "./swatch";

export type { LegendItem } from "./swatch";

/** Names each series beside its color, to the side of the plot it explains. */
export function Legend({
  label,
  items,
}: {
  label: string;
  items: LegendItem[];
}) {
  return (
    <ul className="ns-legend" aria-label={label}>
      {items.map((item, index) => (
        <li className="ns-legend-item" key={item.name}>
          <span className={swatchClass(item, index)} aria-hidden="true" />
          {item.name}
        </li>
      ))}
    </ul>
  );
}

interface ColorBarProps {
  label: string;
  scale: "sequential" | "diverging";
  /** End values with their unit, such as “−40.3 dB”. */
  low: string;
  high: string;
}

/** The color scale beside a heat map or spectrogram, with its ends printed. */
export function ColorBar({ label, scale, low, high }: ColorBarProps) {
  return (
    <div
      className="ns-colorbar"
      role="img"
      aria-label={`${label}, from ${low} to ${high}`}
    >
      <span className={`ns-colorbar-ramp ns-colorbar-ramp--${scale}`} />
      <span className="ns-colorbar-high">{high}</span>
      <span className="ns-colorbar-low">{low}</span>
    </div>
  );
}
