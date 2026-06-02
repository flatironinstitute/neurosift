import { FunctionComponent } from "react";
import { ALL_ROW, SelectorOption } from "./useChain";

// Case-insensitive natural sort: "step_1" < "step_2" < "step_10". Uses the
// browser's Intl.Collator, which is the standard way to do natsort in JS.
const NAT_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function sortOptionsNaturally(options: SelectorOption[]): SelectorOption[] {
  return [...options].sort((a, b) => NAT_COLLATOR.compare(a.label, b.label));
}

interface Props {
  label: string;
  options: SelectorOption[] | null; // null = still loading
  value: number | undefined;
  onChange: (row: number | undefined) => void;
  allowAll?: boolean; // shows "All" as an explicit pick (value=ALL_ROW)
  error?: string;
  childLabel?: string; // e.g. "protocols" for repetitions; "sweeps" for protocols
  // Whether to hide the dropdown when there's exactly one option.
  //
  // Design decision: only tiers that DO NOT gate rendering should hide
  // themselves on the 1-option case (e.g. Condition, Repetition). Tiers that
  // DO gate rendering (Protocol) must stay visible even with one option,
  // because the user needs a selector to commit a pick — without that pick,
  // the render gate stays closed and the plot pane shows the "Pick a
  // Protocol..." prompt forever (a real failure mode observed on 001354,
  // whose single `ramp` protocol caused the Protocol selector to vanish
  // and left the user with no obvious way to render anything).
  hideWhenSingleOption?: boolean;
}

const SelectorDropdown: FunctionComponent<Props> = ({
  label,
  options,
  value,
  onChange,
  allowAll = false,
  error,
  childLabel,
  hideWhenSingleOption = true,
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

  // Hide the dropdown when there's nothing to choose, but only for tiers
  // where this is safe (Condition, Repetition; see the prop doc above for
  // why this is gated on hideWhenSingleOption). Scope stays undefined for
  // this tier; the chain hook treats undefined as "all", which on a
  // 1-option tier is the same set as picking row 0. The "Chain depth"
  // section in the sidebar still shows that the tier exists.
  if (options.length === 1 && hideWhenSingleOption) {
    return null;
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
        {value === undefined && (
          <option value="" disabled>
            -- pick one --
          </option>
        )}
        {allowAll && <option value={ALL_ROW}>All</option>}
        {sortOptionsNaturally(options).map((opt) => {
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
