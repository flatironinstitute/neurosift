import { useId, useRef, type ReactNode } from "react";
import { IconButton } from "../IconButton/IconButton";
import { popoverTargetProps } from "../popover/popoverTargetProps";
import { usePopover } from "../popover/usePopover";
import "./Toggletip.css";

interface ToggletipProps {
  title: string;
  children: ReactNode;
}

// "Shared y-scale" reads "About shared y-scale"; acronyms like "PSTH" keep their case.
const about = (title: string) =>
  `About ${/^[A-Z][a-z]/.test(title) ? title[0].toLowerCase() + title.slice(1) : title}`;

/** An info button that opens a short explanation of a setting, until people close it. */
export function Toggletip({ title, children }: ToggletipProps) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const open = usePopover(panel);
  return (
    <span className="ns-toggletip">
      <IconButton
        icon="information"
        label={about(title)}
        variant="ghost"
        size="sm"
        tooltip={false}
        {...popoverTargetProps(id)}
        aria-expanded={open}
      />
      <div id={id} ref={panel} popover="auto" className="ns-toggletip-panel">
        <p className="ns-toggletip-title">{title}</p>
        <div className="ns-toggletip-body">{children}</div>
      </div>
    </span>
  );
}
