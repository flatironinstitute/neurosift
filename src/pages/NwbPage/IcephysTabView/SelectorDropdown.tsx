import { FunctionComponent } from "react";
import { SelectorOption } from "./useChain";

interface Props {
  label: string;
  options: SelectorOption[] | null; // null = still loading
  value: number | undefined;
  onChange: (row: number | undefined) => void;
  allowAny?: boolean; // shows "(any)" as the first option, value=undefined
  error?: string;
  childLabel?: string; // e.g. "protocols" for repetitions; "sweeps" for protocols
}

const SelectorDropdown: FunctionComponent<Props> = ({
  label,
  options,
  value,
  onChange,
  allowAny = true,
  error,
  childLabel,
}) => {
  if (error) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ color: "#b00", fontSize: 12 }}>error: {error}</div>
      </div>
    );
  }
  if (options === null) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>loading...</div>
      </div>
    );
  }
  if (options.length === 0) {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#888" }}>no rows</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <select
        value={value === undefined ? "" : String(value)}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? undefined : parseInt(v, 10));
        }}
        style={{ width: "100%", padding: "6px 8px", fontSize: 13 }}
      >
        {allowAny && <option value="">(any)</option>}
        {!allowAny && value === undefined && (
          <option value="" disabled>
            -- choose --
          </option>
        )}
        {options.map((opt) => {
          const childCount = childLabel
            ? ` (${opt.nChildren} ${childLabel}${opt.nChildren === 1 ? "" : "s"})`
            : "";
          return (
            <option key={opt.row} value={opt.row}>
              {opt.label}
              {childCount}
            </option>
          );
        })}
      </select>
    </div>
  );
};

export default SelectorDropdown;
