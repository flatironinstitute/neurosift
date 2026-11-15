import { IconButton } from "../IconButton/IconButton";
import { TimeField } from "./TimeField";
import "../base.css";
import "./TimeControls.css";

export type ChannelRange = { first: number; count: number };

interface ChannelWindowProps {
  /** "Channels" in a timeseries, "Units" in a raster. */
  label: string;
  total: number;
  value: ChannelRange;
  onChange: (value: ChannelRange) => void;
}

const clampRange = ({ first, count }: ChannelRange, total: number) => {
  const c = Math.min(Math.max(1, count), total);
  return { first: Math.min(Math.max(0, first), total - c), count: c };
};

/** Which channels or units a plot shows, zero-based like the indices people use in Python. */
export function ChannelWindow({
  label,
  total,
  value,
  onChange,
}: ChannelWindowProps) {
  const noun = label.toLowerCase();
  const last = value.first + value.count - 1;
  const set = (next: ChannelRange) => onChange(clampRange(next, total));
  return (
    <div className="ns-time-group" role="group" aria-label={label}>
      <span className="ns-time-label" aria-hidden="true">
        {label}
      </span>
      <TimeField
        label={`${label} shown`}
        text={`${value.first}–${last}`}
        commit={(draft) => {
          const m = /^\s*(\d+)\s*[–-]\s*(\d+)\s*$/.exec(draft);
          const a = m ? Number(m[1]) : NaN;
          const b = m ? Number(m[2]) : NaN;
          if (!m || a > b || b >= total)
            return `Use a range such as 0–3, within 0–${total - 1}.`;
          set({ first: a, count: b - a + 1 });
          return undefined;
        }}
      />
      <span className="ns-time-text">of {total}</span>
      <span className="ns-time-divider" />
      <IconButton
        icon="subtract"
        label={`Fewer ${noun}`}
        size="sm"
        disabled={value.count <= 1}
        onClick={() => set({ ...value, count: Math.ceil(value.count / 2) })}
      />
      <IconButton
        icon="add"
        label={`More ${noun}`}
        size="sm"
        disabled={value.count >= total}
        onClick={() => set({ ...value, count: value.count * 2 })}
      />
      <span className="ns-time-divider" />
      <IconButton
        icon="chevron--up"
        label={`Previous ${noun}`}
        size="sm"
        disabled={value.first <= 0}
        onClick={() => set({ ...value, first: value.first - value.count })}
      />
      <IconButton
        icon="chevron--down"
        label={`Next ${noun}`}
        size="sm"
        disabled={last >= total - 1}
        onClick={() => set({ ...value, first: value.first + value.count })}
      />
    </div>
  );
}
