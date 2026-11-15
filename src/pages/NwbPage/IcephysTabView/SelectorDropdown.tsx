import { Select, type SelectOption } from "@ui";
import { FunctionComponent } from "react";
import { ALL_ROW, SelectorOption } from "./useChain";

const NAT_COLLATOR = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function sortOptionsNaturally(options: SelectorOption[]): SelectorOption[] {
  return [...options].sort((a, b) => NAT_COLLATOR.compare(a.label, b.label));
}

interface Props {
  label: string;
  /** Null while the table loads. */
  options: SelectorOption[] | null;
  value: number | undefined;
  onChange: (row: number | undefined) => void;
  /** Offers "All" as a pick of its own (ALL_ROW). */
  allowAll?: boolean;
  error?: string;
  /** Counted after each option, such as "sweep" for protocols. */
  childLabel?: string;
  /**
   * Hides a tier with one option. Protocol keeps it: its pick opens the plot,
   * so a file with a single protocol still needs the field (001354).
   */
  hideWhenSingleOption?: boolean;
  /** Cross-filtering: options that don't occur with the other picks are off. */
  optionEnabled?: (opt: SelectorOption) => boolean;
}

const placeholder = (text: string): SelectOption[] => [
  { value: "", label: text, disabled: true },
];

const SelectorDropdown: FunctionComponent<Props> = ({
  label,
  options,
  value,
  onChange,
  allowAll = false,
  error,
  childLabel,
  hideWhenSingleOption = true,
  optionEnabled,
}) => {
  if (options && options.length === 1 && hideWhenSingleOption) return null;

  const status = error
    ? placeholder("Couldn’t read this table")
    : options === null
      ? placeholder("Loading…")
      : options.length === 0
        ? placeholder("No rows")
        : null;

  const choices: SelectOption[] = status ?? [
    ...(value === undefined
      ? [
          {
            value: "",
            label: `Choose a ${label.toLowerCase()}`,
            disabled: true,
          },
        ]
      : []),
    ...(allowAll ? [{ value: String(ALL_ROW), label: "All" }] : []),
    ...sortOptionsNaturally(options ?? []).map((opt) => ({
      value: String(opt.row),
      label: childLabel
        ? `${opt.label} (${opt.nChildren} ${childLabel}${opt.nChildren === 1 ? "" : "s"})`
        : opt.label,
      disabled: optionEnabled ? !optionEnabled(opt) : false,
    })),
  ];

  return (
    <Select
      label={label}
      size="sm"
      value={status || value === undefined ? "" : String(value)}
      onChange={(v) => onChange(v === "" ? undefined : parseInt(v, 10))}
      options={choices}
      disabled={status !== null}
      error={error ? `Couldn’t read ${label}: ${error}` : undefined}
    />
  );
};

export default SelectorDropdown;
