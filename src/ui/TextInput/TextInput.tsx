import { useId, type InputHTMLAttributes } from "react";
import { Field } from "../Field/Field";
import { fieldAria } from "../Field/fieldAria";
import { IconButton } from "../IconButton/IconButton";
import "./TextInput.css";

interface TextInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "size" | "value" | "onChange" | "type" | "id"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "md" | "sm";
  type?: "text" | "password" | "url" | "email";
  helper?: string;
  error?: string;
  unit?: string;
  hideLabel?: boolean;
  /** A show and hide button for password fields; name says what the field holds, such as "API key". */
  reveal?: {
    shown: boolean;
    onShownChange: (shown: boolean) => void;
    name: string;
  };
}

export function TextInput({
  label,
  value,
  onChange,
  size = "md",
  type = "text",
  helper,
  error,
  unit,
  hideLabel,
  reveal,
  ...native
}: TextInputProps) {
  const id = useId();
  const secret = type === "password" && reveal;
  const shown = secret && reveal.shown;
  return (
    <Field
      id={id}
      label={label}
      size={size}
      helper={helper}
      error={error}
      hideLabel={hideLabel}
    >
      <input
        {...native}
        id={id}
        type={shown ? "text" : type}
        className="ns-field-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        {...fieldAria(id, helper, error, native["aria-describedby"])}
      />
      {secret && (
        <IconButton
          icon={shown ? "view--off" : "view"}
          label={`${shown ? "Hide" : "Show"} ${reveal.name}`}
          variant="ghost"
          size="sm"
          onClick={() => reveal.onShownChange(!shown)}
        />
      )}
      {unit && (
        <span className="ns-field-unit" aria-hidden="true">
          {unit}
        </span>
      )}
    </Field>
  );
}
