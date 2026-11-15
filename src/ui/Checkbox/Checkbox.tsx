import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { Icon } from "../Icon/Icon";
import "../base.css";
import "./Checkbox.css";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "type" | "checked" | "onChange" | "children"
> {
  label: string;
  checked: boolean | "mixed";
  onChange: (checked: boolean) => void;
  count?: number | string;
  /** Keeps the label for screen readers only, where the row around the box already says what it is. */
  hideLabel?: boolean;
}

export function Checkbox({
  label,
  checked,
  onChange,
  count,
  hideLabel = false,
  ...native
}: CheckboxProps) {
  const input = useRef<HTMLInputElement>(null);
  const mixed = checked === "mixed";
  useEffect(() => {
    if (input.current) input.current.indeterminate = mixed;
  }, [mixed]);
  return (
    <label className="ns-checkbox">
      <span className="ns-checkbox-box">
        <input
          {...native}
          ref={input}
          type="checkbox"
          className="ns-checkbox-input"
          checked={checked === true}
          data-mixed={mixed || undefined}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="ns-checkbox-mark ns-checkbox-mark--on">
          <Icon name="checkmark" />
        </span>
        <span className="ns-checkbox-mark ns-checkbox-mark--mixed">
          <Icon name="subtract" />
        </span>
      </span>
      <span className={hideLabel ? "ns-visually-hidden" : undefined}>
        {label}
      </span>
      {count !== undefined && (
        <span className="ns-checkbox-count">{count}</span>
      )}
    </label>
  );
}
