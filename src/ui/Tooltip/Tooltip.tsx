import { useRef, type ReactNode } from "react";
import "./Tooltip.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  label: string;
  shortcut?: string;
  placement?: TooltipPlacement;
  children: ReactNode;
}

// aria-keyshortcuts names keys like ArrowLeft; the tooltip shows them in words.
const KEY_WORDS: Record<string, string> = {
  ArrowLeft: "Left arrow",
  ArrowRight: "Right arrow",
  ArrowUp: "Up arrow",
  ArrowDown: "Down arrow",
  Space: "Space",
  Escape: "Esc",
};

const HOVER_DELAY = 500;
const LEAVE_GRACE = 100;

/** Names an icon-only control on hover and keyboard focus. Its trigger carries the same name, so screen readers skip the tooltip. */
export function Tooltip({
  label,
  shortcut,
  placement = "top",
  children,
}: TooltipProps) {
  const tip = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const shown = useRef(false);

  const later = (action: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(action, ms);
  };
  const show = () => {
    clearTimeout(timer.current);
    if (shown.current) return;
    const source = tip.current!.parentElement!.firstElementChild as HTMLElement;
    tip.current!.showPopover({ source });
    shown.current = true;
  };
  const hide = () => {
    clearTimeout(timer.current);
    if (!shown.current) return false;
    tip.current!.hidePopover();
    shown.current = false;
    return true;
  };

  return (
    <span
      className="ns-tooltip-anchor"
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        if (shown.current) clearTimeout(timer.current);
        else later(show, HOVER_DELAY);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== "touch") later(hide, LEAVE_GRACE);
      }}
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) show();
      }}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === "Escape" && hide()) event.stopPropagation();
      }}
    >
      {children}
      <span
        ref={tip}
        popover="manual"
        aria-hidden="true"
        className={`ns-tooltip ns-tooltip--${placement}`}
      >
        {label}
        {shortcut && (
          <kbd className="ns-tooltip-key">
            {KEY_WORDS[shortcut] ?? shortcut}
          </kbd>
        )}
        <span className="ns-tooltip-arrow" />
      </span>
    </span>
  );
}
