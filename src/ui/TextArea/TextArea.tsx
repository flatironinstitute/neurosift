import { useId, type TextareaHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldAria } from "../Field/fieldAria";
import { useCssVars } from "../useCssVars";
import "./TextArea.css";

interface TextAreaProps extends Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "className" | "style" | "value" | "onChange" | "id" | "rows"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Large matches the Large Search field, for a message box. */
  size?: "lg" | "md" | "sm";
  helper?: string;
  error?: string;
  hideLabel?: boolean;
  rows?: number;
  /** The field grows with its content up to this many rows, then scrolls. */
  maxRows?: number;
}

export function TextArea({
  label,
  value,
  onChange,
  size = "md",
  helper,
  error,
  hideLabel,
  rows = 3,
  maxRows = rows,
  ...native
}: TextAreaProps) {
  const id = useId();
  const area = useCssVars<HTMLTextAreaElement>({
    "--ns-text-area-rows": String(rows),
    "--ns-text-area-max-rows": String(Math.max(rows, maxRows)),
  });
  return (
    <Field
      id={id}
      label={label}
      size={size}
      helper={helper}
      error={error}
      hideLabel={hideLabel}
    >
      <textarea
        {...native}
        ref={area}
        id={id}
        rows={rows}
        className="ns-field-input ns-text-area"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...fieldAria(id, helper, error, native["aria-describedby"])}
      />
    </Field>
  );
}
