import { useEffect, useState, type KeyboardEvent } from "react";
import { TextInput } from "../TextInput/TextInput";

interface TimeFieldProps {
  label: string;
  /** The value as it reads when not being edited. */
  text: string;
  unit?: string;
  /** Returns an error to show, or applies the typed text and returns undefined. */
  commit: (draft: string) => string | undefined;
}

/** A Small field in a time control: Enter or leaving applies, Escape restores the last value. */
export function TimeField({ label, text, unit, commit }: TimeFieldProps) {
  const [draft, setDraft] = useState(text);
  const [error, setError] = useState<string>();
  useEffect(() => {
    setDraft(text);
    setError(undefined);
  }, [text]);

  const apply = () => {
    if (draft === text) return;
    const problem = commit(draft);
    setError(problem);
  };
  return (
    <span className="ns-time-field">
      <TextInput
        label={label}
        hideLabel
        size="sm"
        inputMode="decimal"
        unit={unit}
        value={draft}
        onChange={setDraft}
        error={error}
        onBlur={apply}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === "Enter") apply();
          if (event.key === "Escape") {
            setDraft(text);
            setError(undefined);
          }
        }}
      />
    </span>
  );
}
