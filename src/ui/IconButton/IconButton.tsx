import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { Tooltip, type TooltipPlacement } from "../Tooltip/Tooltip";
import "../control.css";
import "./IconButton.css";

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "style" | "children" | "aria-label" | "aria-keyshortcuts"
> {
  icon: IconName;
  label: string;
  variant?: "secondary" | "ghost";
  size?: "md" | "sm";
  shortcut?: string;
  tooltip?: boolean;
  tooltipPlacement?: TooltipPlacement;
}

export function IconButton({
  icon,
  label,
  variant = "secondary",
  size = "md",
  type = "button",
  shortcut,
  tooltip = true,
  tooltipPlacement,
  ...native
}: IconButtonProps) {
  const button = (
    <button
      {...native}
      type={type}
      aria-label={label}
      aria-keyshortcuts={shortcut}
      className={`ns-icon-button ns-icon-button--${variant} ns-icon-button--${size}`}
    >
      <Icon name={icon} size={size} />
    </button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip label={label} shortcut={shortcut} placement={tooltipPlacement}>
      {button}
    </Tooltip>
  );
}
