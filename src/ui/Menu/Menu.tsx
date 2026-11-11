import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "../Button/Button";
import type { IconName } from "../Icon/Icon";
import { popoverTargetProps } from "../popover/popoverTargetProps";
import { usePopover } from "../popover/usePopover";
import "./Menu.css";

export interface MenuItem {
  label: string;
  meta?: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  label: string;
  items: MenuItem[];
  icon?: IconName;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const STEPS: Record<string, (i: number, n: number) => number> = {
  ArrowDown: (i, n) => (i + 1) % n,
  ArrowUp: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/** A button that opens a list of actions, built on the browser's popover. */
export function Menu({
  label,
  items,
  icon,
  variant = "secondary",
  size = "md",
}: MenuProps) {
  const id = useId();
  const list = useRef<HTMLDivElement>(null);

  const enabled = () => [
    ...list.current!.querySelectorAll<HTMLButtonElement>(
      ".ns-menu-item:not(:disabled)",
    ),
  ];
  const open = usePopover(
    list,
    useCallback(() => enabled()[0]?.focus(), []),
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Tab") return list.current!.hidePopover();
    const step = STEPS[event.key];
    if (!step) return;
    event.preventDefault();
    const all = enabled();
    const current = all.indexOf(document.activeElement as HTMLButtonElement);
    all[step(current, all.length)]?.focus();
  };

  return (
    <div className="ns-menu">
      <Button
        variant={variant}
        size={size}
        icon={icon}
        {...popoverTargetProps(id)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </Button>
      <div
        id={id}
        ref={list}
        popover="auto"
        role="menu"
        aria-label={label}
        className={`ns-menu-list ns-menu-list--${size}`}
        onKeyDown={onKeyDown}
      >
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="ns-menu-item"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect();
              list.current!.hidePopover();
            }}
          >
            {item.label}
            {item.meta && <span className="ns-menu-meta">{item.meta}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
