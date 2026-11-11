import { useRef, useState } from "react";
import { Icon } from "../Icon/Icon";
import "./Navigation.css";

export interface Crumb {
  label: string;
  /** Leave out for the current page, which isn't a link. */
  href?: string;
  /** IDs and file names, in the code face. */
  code?: boolean;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

/** Where the open item sits: archive, Dandiset, folders, file. A narrow window folds the middle into "…". */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const [expanded, setExpanded] = useState(false);
  const nav = useRef<HTMLElement>(null);
  // The "…" button goes away, so focus moves to the first level it revealed.
  const expand = () => {
    setExpanded(true);
    requestAnimationFrame(() =>
      nav.current
        ?.querySelector<HTMLElement>("[data-middle] .ns-crumb")
        ?.focus(),
    );
  };
  const last = items.length - 1;
  return (
    <nav
      ref={nav}
      aria-label="Breadcrumb"
      className="ns-breadcrumbs"
      data-expanded={expanded ? "" : undefined}
    >
      <ol className="ns-breadcrumbs-list">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.label}`}
            className="ns-crumb-item"
            data-middle={index > 0 && index < last ? "" : undefined}
          >
            {index > 0 && <Icon name="chevron--right" />}
            {index === last || !item.href ? (
              <span
                className={`ns-crumb ns-crumb--current${item.code ? " ns-crumb--code" : ""}`}
                aria-current={index === last ? "page" : undefined}
              >
                {item.label}
              </span>
            ) : (
              <a
                className={`ns-crumb ns-crumb--link${item.code ? " ns-crumb--code" : ""}`}
                href={item.href}
              >
                {item.label}
              </a>
            )}
            {index === 0 && last > 1 && (
              <span className="ns-crumb-overflow">
                <Icon name="chevron--right" />
                <button
                  type="button"
                  className="ns-crumb ns-crumb--link"
                  aria-label="Show all levels"
                  onClick={expand}
                >
                  …
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
