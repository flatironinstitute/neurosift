import type { ReactNode } from "react";
import { Toggletip } from "../Toggletip/Toggletip";
import "../base.css";
import "./StatusBar.css";

interface StatusBarProps {
  version: string;
  /** Each item already worded, such as “1,267 datasets” or “Reading file structure, 1,267 datasets”. */
  items: string[];
  details?: ReactNode;
}

/** The thin bar under the file viewer: the build, and what the file has loaded, in words. */
export function StatusBar({ version, items, details }: StatusBarProps) {
  return (
    <div className="ns-statusbar" role="region" aria-label="Status">
      <span className="ns-statusbar-version">{version}</span>
      {items.map((item) => (
        <span className="ns-statusbar-item" key={item}>
          {item}
        </span>
      ))}
      {details && <Toggletip title="Details">{details}</Toggletip>}
    </div>
  );
}
