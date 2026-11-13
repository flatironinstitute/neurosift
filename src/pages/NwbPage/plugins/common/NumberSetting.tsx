import { TextInput } from "@ui";
import { FunctionComponent, useState } from "react";
import { parseOptional } from "./parseOptional";

/** A number typed as text: keeps what is typed, such as "1.", while the setting holds the parsed value. */
const NumberSetting: FunctionComponent<{
  label: string;
  value: number | null;
  onChange: (text: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => {
  const [draft, setDraft] = useState(value == null ? "" : String(value));
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (parseOptional(draft) !== value)
      setDraft(value == null ? "" : String(value));
  }
  return (
    <TextInput
      label={label}
      size="sm"
      inputMode="decimal"
      placeholder={placeholder}
      value={draft}
      onChange={(text) => {
        setDraft(text);
        onChange(text);
      }}
    />
  );
};

export default NumberSetting;
