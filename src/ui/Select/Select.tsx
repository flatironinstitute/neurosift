import { useId, type SelectHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldAria } from "../Field/fieldAria";
import { Icon } from "../Icon/Icon";
import "./Select.css";

export interface SelectOption {
  value: string;
  label: string;
  meta?: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className" | "style" | "size" | "value" | "onChange" | "id" | "multiple"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  size?: "md" | "sm";
  helper?: string;
  error?: string;
  hideLabel?: boolean;
}

export function Select({
  label,
  value,
  onChange,
  options,
  size = "md",
  helper,
  error,
  hideLabel,
  ...native
}: SelectProps) {
  const id = useId();
  return (
    <Field
      id={id}
      label={label}
      size={size}
      helper={helper}
      error={error}
      hideLabel={hideLabel}
    >
      <select
        {...native}
        id={id}
        className="ns-select"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...fieldAria(id, helper, error, native["aria-describedby"])}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            data-meta={option.meta}
          >
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron--down" />
    </Field>
  );
}
