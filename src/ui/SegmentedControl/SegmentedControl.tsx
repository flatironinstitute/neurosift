import type { KeyboardEvent } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import { Tooltip } from "../Tooltip/Tooltip";
import "../base.css";
import "./SegmentedControl.css";

export interface SegmentOption {
  value: string;
  label: string;
  icon?: IconName;
  disabled?: boolean;
}

interface SegmentedControlProps {
  label: string;
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "sm";
  /** Icons only; each label moves to the segment's name and a tooltip. */
  hideLabels?: boolean;
}

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/** Two to four options, all visible, one selected: a radio group that applies at once. */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  size = "md",
  hideLabels = false,
}: SegmentedControlProps) {
  const enabled = options.filter((o) => !o.disabled);

  const select = (option: SegmentOption, group: HTMLElement) => {
    onChange(option.value);
    group
      .querySelector<HTMLElement>(`[data-value="${CSS.escape(option.value)}"]`)
      ?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = enabled.findIndex((o) => o.value === value);
    let next: SegmentOption | undefined;
    if (event.key in STEPS)
      next = enabled[(at + STEPS[event.key] + enabled.length) % enabled.length];
    else if (event.key === "Home") next = enabled[0];
    else if (event.key === "End") next = enabled[enabled.length - 1];
    if (!next) return;
    event.preventDefault();
    select(next, event.currentTarget);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`ns-segmented ns-segmented--${size}`}
      onKeyDown={onKeyDown}
    >
      {options.map((option) => {
        const checked = option.value === value;
        const segment = (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={hideLabels ? option.label : undefined}
            disabled={option.disabled}
            tabIndex={checked ? 0 : -1}
            className="ns-segment"
            data-value={option.value}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <Icon name={option.icon} />}
            {!hideLabels && (
              <span data-label={option.label}>{option.label}</span>
            )}
          </button>
        );
        return hideLabels ? (
          <Tooltip key={option.value} label={option.label}>
            {segment}
          </Tooltip>
        ) : (
          segment
        );
      })}
    </div>
  );
}
