import { useId, type ReactNode, type SyntheticEvent } from "react";
import { Icon } from "../Icon/Icon";
import "./Accordion.css";

interface AccordionItemProps {
  title: string;
  /** The current setting, shown on the right so a closed section still says what it's set to. */
  summary?: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

/** A named section of a control panel. Native details and summary, so the keyboard and state come for free. */
export function AccordionItem({
  title,
  summary,
  open,
  onToggle,
  children,
}: AccordionItemProps) {
  const toggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const next = event.currentTarget.open;
    if (next !== open) onToggle(next);
  };
  return (
    <details className="ns-accordion" open={open} onToggle={toggle}>
      <summary className="ns-accordion-header">
        <span className="ns-accordion-chevron">
          <Icon name="chevron--right" />
          <Icon name="chevron--down" />
        </span>
        <span className="ns-accordion-title">{title}</span>
        {summary && <span className="ns-accordion-summary">{summary}</span>}
      </summary>
      <div className="ns-accordion-content">{children}</div>
    </details>
  );
}

interface DisclosureProps {
  /** Says what will appear: "Show full description", "Show attributes (5)". */
  label: string;
  expandedLabel?: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

/** An inline show-and-hide for one block, such as a long description or an object's attributes. */
export function Disclosure({
  label,
  expandedLabel,
  open,
  onToggle,
  children,
}: DisclosureProps) {
  const id = useId();
  return (
    <>
      <button
        type="button"
        className="ns-disclosure"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onToggle(!open)}
      >
        <Icon name={open ? "caret--down" : "caret--right"} />
        {open && expandedLabel ? expandedLabel : label}
      </button>
      <div id={id} className="ns-disclosure-content" hidden={!open}>
        {children}
      </div>
    </>
  );
}
