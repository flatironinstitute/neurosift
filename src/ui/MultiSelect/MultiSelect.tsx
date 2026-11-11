import { useId, useState, type KeyboardEvent } from "react";
import { Field } from "../Field/Field";
import { fieldAria } from "../Field/fieldAria";
import { IconButton } from "../IconButton/IconButton";
import "../Badge/Badge.css";
import "../base.css";
import "./MultiSelect.css";

export interface MultiSelectOption {
  value: string;
  label: string;
  /** A count or note at the end of the row, such as “1,203 files”. */
  meta?: string;
}

interface RemovableTagProps {
  label: string;
  onRemove: () => void;
  code?: boolean;
}

/** A chosen value in a Multi-select. The × removes it. */
export function RemovableTag({
  label,
  onRemove,
  code = false,
}: RemovableTagProps) {
  return (
    <span
      className={
        code
          ? "ns-tag ns-tag--removable ns-tag--code"
          : "ns-tag ns-tag--removable"
      }
    >
      {label}
      <IconButton
        icon="close"
        label={`Remove ${label}`}
        variant="ghost"
        size="sm"
        tooltip={false}
        onClick={onRemove}
      />
    </span>
  );
}

interface MultiSelectProps {
  label: string;
  helper?: string;
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** Set values in the code face, such as neurodata types. */
  code?: boolean;
  /** What the options are, for “No types match …”. */
  noun?: string;
  "aria-describedby"?: string;
}

/** Several values from a long list, picked by typing. Matches anywhere in the name. */
export function MultiSelect({
  label,
  helper,
  options,
  value,
  onChange,
  code = false,
  noun = "options",
  "aria-describedby": describedBy,
}: MultiSelectProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const byValue = new Map(options.map((option) => [option.value, option]));
  const needle = query.trim().toLowerCase();
  const matches = options.filter(
    (option) =>
      !value.includes(option.value) &&
      option.label.toLowerCase().includes(needle),
  );
  const optionId = (index: number) => `${id}-option-${index}`;

  const choose = (option: MultiSelectOption) => {
    onChange([...value, option.value]);
    setQuery("");
    setActive(-1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const last = matches.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const down = event.key === "ArrowDown";
      setActive((index) =>
        down ? (index >= last ? 0 : index + 1) : index <= 0 ? last : index - 1,
      );
    } else if (event.key === "Enter" && open && matches[active]) {
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
    } else if (event.key === "Backspace" && query === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="ns-multiselect">
      <Field id={id} label={label} size="md" helper={helper}>
        {value.map((chosen) => (
          <RemovableTag
            key={chosen}
            label={byValue.get(chosen)?.label ?? chosen}
            code={code}
            onRemove={() => onChange(value.filter((v) => v !== chosen))}
          />
        ))}
        <input
          id={id}
          className="ns-field-input ns-multiselect-input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[active] ? optionId(active) : undefined
          }
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
          {...fieldAria(id, helper, undefined, describedBy)}
        />
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="ns-multiselect-list"
          hidden={!open}
        >
          {matches.map((option, index) => (
            <div
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              data-value={option.value}
              className={
                code
                  ? "ns-multiselect-option ns-multiselect-option--code"
                  : "ns-multiselect-option"
              }
              onMouseDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
            >
              <span>{option.label}</span>
              {option.meta && (
                <span className="ns-multiselect-meta">{option.meta}</span>
              )}
            </div>
          ))}
          {matches.length === 0 && (
            <p className="ns-multiselect-empty">
              {needle
                ? `No ${noun} match “${query.trim()}”`
                : `Every ${noun.replace(/s$/, "")} is chosen`}
            </p>
          )}
        </div>
      </Field>
    </div>
  );
}
