import {
  Fragment,
  useEffect,
  useId,
  useRef,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Checkbox } from "../Checkbox/Checkbox";
import { Icon } from "../Icon/Icon";
import { Spinner } from "../Spinner/Spinner";
import "../base.css";
import "./DataTable.css";

export type SortDirection = "ascending" | "descending";
export type Sort = { key: string; direction: SortDirection };
type CellValue = string | number | null | undefined;
export type Cell = { row: string; column: string };

/** A list cell: how many values a row holds, then as many of them as fit. */
export interface ListCell {
  /** "1,652", "2 lists" or "0 values". */
  count: string;
  values?: string;
  /** Shows Reading… in place of the values. */
  loading?: boolean;
  /** Opens the detail row; false when the cell already shows every value. */
  expandable?: boolean;
}

export interface Column<Row> {
  key: string;
  /** Sentence case, with units: "Firing rate (Hz)". */
  label: string;
  /** Text in Plex Sans; numbers and code (IDs, paths, types) in Plex Mono, numbers right-aligned; lists show a count and values. */
  type?: "text" | "number" | "code" | "list";
  value: (row: Row) => CellValue;
  /** For list columns: what each cell shows. */
  list?: (row: Row) => ListCell;
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
  /** The open list cell; its detail row shows under its row, full width. */
  expanded?: Cell;
  onExpandedChange?: (cell?: Cell) => void;
  /** The detail row's content for an open list cell. */
  detail?: (row: Row, column: string) => ReactNode;
  /** Called once per row when it first scrolls into view, so its values can load then. */
  onRowVisible?: (key: string) => void;
}

function useRowsVisible(
  scroller: React.RefObject<HTMLDivElement | null>,
  keys: string[],
  onRowVisible?: (key: string) => void,
) {
  const seen = useRef(new Set<string>());
  const report = useRef(onRowVisible);
  report.current = onRowVisible;
  const joined = keys.join("\n");
  useEffect(() => {
    const root = scroller.current;
    if (!root || !report.current) return;
    const visible = (key: string) => {
      if (seen.current.has(key)) return;
      seen.current.add(key);
      report.current?.(key);
    };
    const rows = Array.from(
      root.querySelectorAll<HTMLTableRowElement>("tr[data-row]"),
    );
    if (typeof IntersectionObserver === "undefined") {
      rows.forEach((tr) => visible(tr.dataset.row!));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries
          .filter((e) => e.isIntersecting)
          .forEach((e) => visible((e.target as HTMLElement).dataset.row!)),
      { root, rootMargin: "100px 0px" },
    );
    rows.forEach((tr) => observer.observe(tr));
    return () => observer.disconnect();
  }, [scroller, joined]);
}

function ListCellContent({
  cell,
  open,
  controls,
  name,
  onToggle,
}: {
  cell: ListCell;
  open: boolean;
  controls: string;
  name: string;
  onToggle?: () => void;
}) {
  const values = cell.loading ? (
    <span className="ns-list-values ns-list-values--loading">
      <Spinner />
      Reading…
    </span>
  ) : (
    cell.values && (
      <span className="ns-list-values" title={cell.values}>
        {cell.values}
      </span>
    )
  );
  if (!cell.expandable || !onToggle)
    return (
      <span className="ns-list-cell">
        <span className="ns-list-count">{cell.count}</span>
        {values}
      </span>
    );
  return (
    <span className="ns-list-cell">
      <button
        type="button"
        className="ns-list-toggle"
        aria-expanded={open}
        aria-controls={controls}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        <Icon name={open ? "caret--down" : "caret--right"} />
        <span className="ns-list-count">{cell.count}</span>{" "}
        <span className="ns-visually-hidden">in {name}</span>
      </button>
      {values}
    </span>
  );
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
  expanded,
  onExpandedChange,
  detail,
  onRowVisible,
}: DataTableProps<Row>) {
  const scroller = useRef<HTMLDivElement>(null);
  const idPrefix = useId();
  const keys = rows.map(rowKey);
  useRowsVisible(scroller, keys, onRowVisible);
  const span = columns.length + (selected && onSelectedChange ? 1 : 0);
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
      ref={scroller}
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
          {rows.map((row, rowIndex) => {
            const key = keys[rowIndex];
            const detailId = (column: string) =>
              `${idPrefix}-${key}-${column}-detail`;
            const name = (column: Column<Row>) =>
              `${column.label}, ${rowLabel?.(row) ?? key}`;
            const open =
              expanded?.row === key
                ? columns.find((c) => c.key === expanded.column)
                : undefined;
            const isSelected =
              (selectable && selected!.includes(key)) || key === active;
            const onClick = selectable
              ? () => toggle(key)
              : onActivate
                ? () => onActivate(key)
                : undefined;
            return (
              <Fragment key={key}>
                <tr
                  data-row={key}
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
                    if (column.type === "list" && column.list)
                      return (
                        <td key={column.key} className="ns-cell--list">
                          <ListCellContent
                            cell={column.list(row)}
                            open={open === column}
                            controls={detailId(column.key)}
                            name={name(column)}
                            onToggle={
                              onExpandedChange &&
                              (() =>
                                onExpandedChange(
                                  open === column
                                    ? undefined
                                    : { row: key, column: column.key },
                                ))
                            }
                          />
                        </td>
                      );
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
                              <span className="ns-visually-hidden">
                                No value
                              </span>
                            </>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
                {open && detail && (
                  <tr className="ns-table-detail">
                    <td colSpan={span}>
                      <div
                        id={detailId(open.key)}
                        role="region"
                        aria-label={name(open)}
                        className="ns-table-detail-content"
                      >
                        {detail(row, open.key)}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
