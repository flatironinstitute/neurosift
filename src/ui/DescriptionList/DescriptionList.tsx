import type { ReactNode } from "react";
import "../base.css";
import "./DescriptionList.css";

export interface Description {
  term: string;
  value: ReactNode;
  /** Identifiers, paths and values that are copied, in the code face. */
  code?: boolean;
  /** Why the value is missing, shown after an em dash when there is no value. */
  missing?: string;
}

interface DescriptionListProps {
  label: string;
  items: Description[];
  layout?: "beside" | "stacked" | "code";
}

/** Keys and values: panel fields beside, facts stacked, HDF5 attributes in code. */
export function DescriptionList({
  label,
  items,
  layout = "beside",
}: DescriptionListProps) {
  return (
    <dl className={`ns-dl ns-dl--${layout}`} aria-label={label}>
      {items.map(({ term, value, code, missing }) => (
        <div className="ns-dl-row" key={term}>
          <dt className="ns-dl-term">{term}</dt>
          <dd
            className={code ? "ns-dl-value ns-dl-value--code" : "ns-dl-value"}
          >
            {value ?? `— ${missing ?? "Not in this file"}`}
          </dd>
        </div>
      ))}
    </dl>
  );
}
