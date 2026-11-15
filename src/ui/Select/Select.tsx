import { useId, useSyncExternalStore, type SelectHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldAria } from "../Field/fieldAria";
import { Icon } from "../Icon/Icon";
import { SelectListbox } from "./SelectListbox";
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

/**
 * Desktop browsers without customizable selects (Safari 26, older Firefox) draw their own list, which can't take
 * the design; they get the listbox instead, where they can anchor it. Touch screens keep the native picker.
 */
const listboxInstead = () =>
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  !CSS.supports("appearance", "base-select") &&
  CSS.supports("anchor-name", "--ns-select") &&
  window.matchMedia?.("(pointer: fine)").matches === true;

const noSubscription = () => () => {};

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
  // Server rendering and hydration use the native select; the browser then decides.
  const listbox = useSyncExternalStore(
    noSubscription,
    listboxInstead,
    () => false,
  );
  const aria = fieldAria(id, helper, error, native["aria-describedby"]);
  if (listbox)
    return (
      <Field
        id={id}
        label={label}
        size={size}
        helper={helper}
        error={error}
        hideLabel={hideLabel}
      >
        <SelectListbox
          id={id}
          label={label}
          value={value}
          onChange={onChange}
          options={options}
          disabled={native.disabled}
          aria={aria}
        >
          <Icon name="chevron--down" />
        </SelectListbox>
      </Field>
    );
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
        {...aria}
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
