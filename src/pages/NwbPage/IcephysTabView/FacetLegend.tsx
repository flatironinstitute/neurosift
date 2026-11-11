import { useCssVars } from "@components/useCssVars";
import { FunctionComponent } from "react";
import type { facetColors } from "./sweepGroups";

type Categorical = ReturnType<typeof facetColors>;

/** One swatch in the trace's own color, which the chart picks at run time. */
const Swatch: FunctionComponent<{ color: string }> = ({ color }) => {
  const ref = useCssVars<HTMLSpanElement>({ "--icephys-swatch": color });
  return <span ref={ref} className="icephys-swatch" aria-hidden="true" />;
};

/** Names each group beside the color its traces are drawn in. */
const FacetLegend: FunctionComponent<{
  label: string;
  categorical: Categorical;
}> = ({ label, categorical }) => {
  if (categorical.order.length === 0) return null;
  return (
    <ul className="icephys-legend" aria-label={label}>
      {categorical.order.map((id) => (
        <li key={id} className="icephys-legend-item">
          <Swatch color={categorical.colorOf.get(id) ?? ""} />
          {categorical.labelOf.get(id)}
        </li>
      ))}
    </ul>
  );
};

export default FacetLegend;
