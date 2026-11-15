import { useCallback, useId, useRef, type KeyboardEvent } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "../Button/Button";
import { Icon, type IconName } from "../Icon/Icon";
import { popoverTargetProps } from "../popover/popoverTargetProps";
import { usePopover } from "../popover/usePopover";
import "./Menu.css";

export interface MenuItem {
  label: string;
  meta?: string;
  disabled?: boolean;
  /** Makes the item one choice of several: true marks the current one. */
  checked?: boolean;
  onSelect: () => void;
}

/** A titled set of items, such as the choices for one setting. */
export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface MenuProps {
  label: string;
  /** A plain list; pass groups instead for titled sets of choices. */
  items?: MenuItem[];
  groups?: MenuGroup[];
  icon?: IconName;
  /** Shows only the icon; the label still names the button. */
  iconOnly?: boolean;
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
  items = [],
  groups,
  icon,
  iconOnly = false,
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
    // A menu of choices opens on the current one.
    useCallback(
      () =>
        (
          enabled().find(
            (item) => item.getAttribute("aria-checked") === "true",
          ) ?? enabled()[0]
        )?.focus(),
      [],
    ),
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

  const renderItem = (item: MenuItem) => {
    const choice = item.checked !== undefined;
    return (
      <button
        key={item.label}
        type="button"
        role={choice ? "menuitemradio" : "menuitem"}
        aria-checked={choice ? item.checked : undefined}
        tabIndex={-1}
        className="ns-menu-item"
        disabled={item.disabled}
        onClick={() => {
          item.onSelect();
          list.current!.hidePopover();
        }}
      >
        {choice && (
          <span className="ns-menu-check" aria-hidden="true">
            {item.checked && <Icon name="checkmark" />}
          </span>
        )}
        {item.label}
        {item.meta && <span className="ns-menu-meta">{item.meta}</span>}
      </button>
    );
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
        aria-label={iconOnly ? label : undefined}
      >
        {iconOnly ? <span className="ns-visually-hidden">{label}</span> : label}
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
        {groups
          ? groups.map((group, index) => (
              <div
                key={group.label}
                role="group"
                aria-labelledby={`${id}-group-${index}`}
                className="ns-menu-group"
              >
                <div
                  id={`${id}-group-${index}`}
                  role="presentation"
                  className="ns-menu-group-label"
                >
                  {group.label}
                </div>
                {group.items.map(renderItem)}
              </div>
            ))
          : items.map(renderItem)}
      </div>
    </div>
  );
}
