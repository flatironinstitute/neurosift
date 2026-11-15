import { useEffect, useState, type KeyboardEvent } from "react";
import { TextInput } from "../TextInput/TextInput";
import { formatValue, parseValue } from "./sliderMath";

interface SliderFieldProps {
  label: string;
  value: number;
  step: number;
  disabled?: boolean;
  /** Returns an error to show, or commits the number and returns undefined. */
  commit: (value: number) => string | undefined;
  invalid: string;
}

/** The Small field beside a slider: type an exact value, applied on Enter or when leaving the field. */
export function SliderField({
  label,
  value,
  step,
  disabled,
  commit,
  invalid,
}: SliderFieldProps) {
  const [draft, setDraft] = useState(formatValue(value, step));
  const [error, setError] = useState<string>();
  useEffect(() => {
    setDraft(formatValue(value, step));
    setError(undefined);
  }, [value, step]);

  const apply = () => {
    const n = parseValue(draft);
    const problem = n === undefined ? invalid : commit(n);
    setError(problem);
    if (!problem && n !== undefined) setDraft(formatValue(value, step));
  };

  return (
    <div className="ns-slider-field">
      <TextInput
        label={label}
        hideLabel
        size="sm"
        inputMode="decimal"
        value={draft}
        onChange={setDraft}
        error={error}
        disabled={disabled}
        onBlur={apply}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") apply();
        }}
      />
    </div>
  );
}
