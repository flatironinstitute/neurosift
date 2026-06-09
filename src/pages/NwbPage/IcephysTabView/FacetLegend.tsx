import { CSSProperties, FunctionComponent } from "react";
import { GroupBy, groupOf } from "./FamilyOverlayPlot";
import { categorical } from "./palette";
import { LoadedSweep } from "./useSweepData";

// Shared color assignment for a faceted view's inner-color axis. Computed once
// over all sweeps (global first-appearance order) so every panel and this legend
// use the same color for the same group. Categorical only; the per-sweep
// gradient is handled separately (each panel uses its own hue).
export function facetColors(
  sweeps: LoadedSweep[],
  axis: GroupBy,
): {
  order: number[];
  labelOf: Map<number, string>;
  colorOf: Map<number, string>;
} {
  const order: number[] = [];
  const labelOf = new Map<number, string>();
  for (const sw of sweeps) {
    const g = groupOf(sw, axis);
    if (!labelOf.has(g.id)) {
      order.push(g.id);
      labelOf.set(g.id, g.label);
    }
  }
  const colorOf = new Map<number, string>();
  order.forEach((id, i) => colorOf.set(id, categorical(i)));
  return { order, labelOf, colorOf };
}

interface Props {
  // Categorical legend: ordered ids with labels + colors (swatch + text).
  categorical?: {
    order: number[];
    labelOf: Map<number, string>;
    colorOf: Map<number, string>;
  };
}

const FacetLegend: FunctionComponent<Props> = ({ categorical }) => {
  const wrap: CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    padding: "2px 6px 6px",
    fontSize: 11,
    color: "#444",
  };
  if (!categorical || categorical.order.length === 0) return null;
  return (
    <div style={wrap}>
      {categorical.order.map((id) => (
        <span
          key={id}
          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
        >
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: categorical.colorOf.get(id) || "#444",
              flex: "0 0 auto",
            }}
          />
          {categorical.labelOf.get(id)}
        </span>
      ))}
    </div>
  );
};

export default FacetLegend;
