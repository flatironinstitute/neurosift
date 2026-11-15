import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Icon } from "../Icon/Icon";
import type { fieldAria } from "../Field/fieldAria";
import type { SelectOption } from "./Select";

interface SelectListboxProps {
  id: string;
  /** Names the open list, as the field's label names the field. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** The field's helper and error ids, and aria-invalid. */
  aria: ReturnType<typeof fieldAria>;
  /** The chevron, drawn by the Select like the native one. */
  children: ReactNode;
}

const PAGE = 10;
const TYPE_AHEAD_MS = 500;

/**
 * The open list for browsers without customizable selects: a select-only combobox (WAI-ARIA APG).
 * Focus stays on the field; aria-activedescendant names the highlighted option.
 */
export function SelectListbox({
  id,
  label,
  value,
  onChange,
  options,
  disabled,
  aria,
  children,
}: SelectListboxProps) {
  const field = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", at: 0 });
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  // The anchor name ties the list to this field; ids from useId hold colons, which idents can't.
  const anchor = `--ns-select-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    field.current?.parentElement?.style.setProperty("anchor-name", anchor);
    list.current?.style.setProperty("position-anchor", anchor);
  }, [anchor]);

  useEffect(() => {
    const element = list.current;
    if (!element) return;
    const onToggle = (event: Event) =>
      setOpen((event as ToggleEvent).newState === "open");
    element.addEventListener("toggle", onToggle);
    return () => element.removeEventListener("toggle", onToggle);
  }, []);

  useEffect(() => {
    if (open)
      document
        .getElementById(optionId(active))
        ?.scrollIntoView({ block: "nearest" });
    // optionId only joins strings from props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  const enabled = (index: number) => !options[index]?.disabled;
  /** The nearest enabled option from `from`, moving by `step`, kept inside the list. */
  const step = (from: number, by: number) => {
    let index = from;
    for (let moved = 0; moved < Math.abs(by); ) {
      const next = index + Math.sign(by);
      if (next < 0 || next >= options.length) break;
      index = next;
      if (enabled(index)) moved++;
    }
    return enabled(index) ? index : from;
  };
  const first = () => step(-1, 1);
  const last = () => step(options.length, -1);

  const show = (at = selected) => {
    setActive(enabled(at) ? at : first());
    list.current?.showPopover();
  };
  const hide = () => list.current?.hidePopover();
  const pick = (index: number) => {
    if (!enabled(index)) return;
    if (options[index].value !== value) onChange(options[index].value);
    hide();
    field.current?.focus();
  };

  /** Typing jumps to the next option starting with the letters typed together. */
  const typeAhead = (key: string, from: number) => {
    const now = Date.now();
    const text =
      now - typed.current.at < TYPE_AHEAD_MS ? typed.current.text + key : key;
    typed.current = { text, at: now };
    const lower = text.toLowerCase();
    const start = text.length === 1 ? from + 1 : from;
    for (let n = 0; n < options.length; n++) {
      const index = (start + n) % options.length;
      if (
        enabled(index) &&
        options[index].label.toLowerCase().startsWith(lower)
      )
        return index;
    }
    return -1;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const { key, altKey } = event;
    if (key.length === 1 && key !== " " && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      const match = typeAhead(key, open ? active : selected);
      if (match < 0) return;
      // Closed, typing picks, as a native select does; open, it highlights.
      if (open) setActive(match);
      else if (options[match].value !== value) onChange(options[match].value);
      return;
    }
    const closedKeys: Record<string, () => void> = {
      ArrowDown: () => show(),
      ArrowUp: () => show(),
      Enter: () => show(),
      " ": () => show(),
      Home: () => show(first()),
      End: () => show(last()),
    };
    const openKeys: Record<string, () => void> = {
      ArrowDown: () => (altKey ? pick(active) : setActive(step(active, 1))),
      ArrowUp: () => (altKey ? pick(active) : setActive(step(active, -1))),
      Home: () => setActive(first()),
      End: () => setActive(last()),
      PageDown: () => setActive(step(active, PAGE)),
      PageUp: () => setActive(step(active, -PAGE)),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: hide,
      Tab: hide,
    };
    const action = (open ? openKeys : closedKeys)[key];
    if (!action) return;
    if (key !== "Tab") event.preventDefault();
    action();
  };

  return (
    <>
      <button
        ref={field}
        id={id}
        type="button"
        role="combobox"
        className="ns-select ns-select--listbox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? optionId(active) : undefined}
        disabled={disabled}
        onClick={() => (open ? hide() : show())}
        onKeyDown={onKeyDown}
        {...aria}
      >
        <span className="ns-select-value">{options[selected]?.label}</span>
      </button>
      {children}
      <div
        ref={list}
        id={listId}
        popover="auto"
        role="listbox"
        aria-label={label}
        className="ns-select-list"
        tabIndex={-1}
      >
        {options.map((option, index) => (
          <div
            key={option.value}
            id={optionId(index)}
            role="option"
            aria-selected={index === selected}
            aria-disabled={option.disabled || undefined}
            data-active={open && index === active ? "" : undefined}
            className="ns-select-option"
            // Keep focus on the field, so the list never takes it.
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => enabled(index) && setActive(index)}
            onClick={() => pick(index)}
          >
            <span className="ns-select-check">
              {index === selected && <Icon name="checkmark" />}
            </span>
            <span className="ns-select-option-label">{option.label}</span>
            {option.meta && (
              <span className="ns-select-option-meta">{option.meta}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
