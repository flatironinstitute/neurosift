import { useId, useRef, type InputHTMLAttributes } from "react";
import { Icon } from "../Icon/Icon";
import { IconButton } from "../IconButton/IconButton";
import { Spinner } from "../Spinner/Spinner";
import "../base.css";
import "../field.css";
import "./SearchField.css";

interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "style" | "size" | "value" | "onChange" | "type" | "id"
> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  size?: "lg" | "md";
  loading?: boolean;
}

export function SearchField({
  label,
  value,
  onChange,
  onSearch,
  size = "lg",
  loading = false,
  ...native
}: SearchFieldProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const clear = () => {
    onChange("");
    input.current?.focus();
  };
  return (
    <form
      role="search"
      className={`ns-search ns-search--${size}`}
      aria-busy={loading || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value);
      }}
    >
      <label className="ns-visually-hidden" htmlFor={id}>
        {label}
      </label>
      <Icon name="search" size={size === "lg" ? "md" : "sm"} />
      <input
        {...native}
        ref={input}
        id={id}
        type="search"
        className="ns-search-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onChange("");
        }}
      />
      {loading ? (
        <Spinner />
      ) : (
        value && (
          <IconButton
            icon="close"
            label="Clear search"
            variant="ghost"
            size="sm"
            onClick={clear}
          />
        )
      )}
    </form>
  );
}
