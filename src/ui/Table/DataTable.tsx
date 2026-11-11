import { Checkbox } from "../Checkbox/Checkbox";
import { Icon } from "../Icon/Icon";
import "../base.css";
import "./DataTable.css";

export type SortDirection = "ascending" | "descending";
export type Sort = { key: string; direction: SortDirection };
type CellValue = string | number | null | undefined;

export interface Column<Row> {
  key: string;
  /** Sentence case, with units: "Firing rate (Hz)". */
  label: string;
  /** Text in Plex Sans; numbers and code (IDs, paths, types) in Plex Mono, numbers right-aligned. */
  type?: "text" | "number" | "code";
  value: (row: Row) => CellValue;
  /** Fixed decimal places for numbers. */
  digits?: number;
  sortable?: boolean;
}

interface DataTableProps<Row> {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  density?: "default" | "compact";
  sort?: Sort;
  onSort?: (sort: Sort) => void;
  /** With onSelectedChange, a checkbox column lets people pick rows. */
  selected?: string[];
  onSelectedChange?: (keys: string[]) => void;
  /** Names each row's checkbox, such as "Unit 3". */
  rowLabel?: (row: Row) => string;
  /** With onActivate, one row at a time opens its details; its first cell is the button. */
  active?: string;
  onActivate?: (key: string) => void;
}

const format = (value: CellValue, column: Column<unknown>) => {
  if (value === null || value === undefined || value === "") return null;
  if (column.type === "number" && typeof value === "number") {
    if (Number.isNaN(value)) return null;
    return value.toLocaleString("en-US", {
      minimumFractionDigits: column.digits,
      maximumFractionDigits: column.digits ?? 20,
    });
  }
  return String(value);
};

/** A data table: rules, not fills; numbers in the code face; the whole row selects. */
export function DataTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  density = "default",
  sort,
  onSort,
  selected,
  onSelectedChange,
  rowLabel,
  active,
  onActivate,
}: DataTableProps<Row>) {
  const selectable = Boolean(selected && onSelectedChange);
  const toggle = (key: string) =>
    onSelectedChange?.(
      selected!.includes(key)
        ? selected!.filter((k) => k !== key)
        : [...selected!, key],
    );
  const nextSort = (key: string): Sort => ({
    key,
    direction:
      sort?.key === key && sort.direction === "ascending"
        ? "descending"
        : "ascending",
  });

  // A wide table scrolls in a region people can reach and scroll from the keyboard.
  return (
    <div
      className="ns-table-scroll"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className={`ns-table ns-table--${density}`}>
        <caption className="ns-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {selectable && (
              <th scope="col" className="ns-cell--check">
                <span className="ns-visually-hidden">Selected</span>
              </th>
            )}
            {columns.map((column) => {
              const sorted =
                sort?.key === column.key ? sort.direction : undefined;
              const align = column.type === "number" ? " ns-cell--number" : "";
              // Right-aligned columns lead with the arrow, so labels line up with their numbers.
              const arrow = (
                <Icon
                  name={sorted === "descending" ? "arrow--down" : "arrow--up"}
                />
              );
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={sorted}
                  className={`ns-table-head${align}`}
                >
                  {column.sortable && onSort ? (
                    <button
                      type="button"
                      className="ns-table-sort"
                      onClick={() => onSort(nextSort(column.key))}
                    >
                      {column.type === "number" && arrow}
                      {column.label}
                      {column.type !== "number" && arrow}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row);
            const isSelected =
              (selectable && selected!.includes(key)) || key === active;
            const onClick = selectable
              ? () => toggle(key)
              : onActivate
                ? () => onActivate(key)
                : undefined;
            return (
              <tr
                key={key}
                className={isSelected ? "ns-row--selected" : undefined}
                onClick={onClick}
              >
                {selectable && (
                  <td
                    className="ns-cell--check"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Checkbox
                      label={rowLabel?.(row) ?? key}
                      hideLabel
                      checked={isSelected}
                      onChange={() => toggle(key)}
                    />
                  </td>
                )}
                {columns.map((column, index) => {
                  const text = format(
                    column.value(row),
                    column as Column<unknown>,
                  );
                  const type = column.type ?? "text";
                  return (
                    <td key={column.key} className={`ns-cell--${type}`}>
                      {index === 0 && onActivate && !selectable ? (
                        <button
                          type="button"
                          className="ns-table-activate"
                          aria-current={key === active ? "true" : undefined}
                        >
                          {text ?? key}
                        </button>
                      ) : (
                        (text ?? (
                          <>
                            <span
                              className="ns-cell-missing"
                              aria-hidden="true"
                            >
                              —
                            </span>
                            <span className="ns-visually-hidden">No value</span>
                          </>
                        ))
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
