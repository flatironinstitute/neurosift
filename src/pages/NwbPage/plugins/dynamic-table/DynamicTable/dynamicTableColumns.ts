import type { Column, ListCell } from "@ui";
import { csvList } from "./ragged";
import type { RowItem } from "./sortRowItems";

const MAX_ITEMS = 200;

type Reference = { _REFERENCE: { path: string } };

const isReference = (value: unknown): value is Reference =>
  typeof value === "object" && value !== null && "_REFERENCE" in value;

const isList = (value: unknown): value is ArrayLike<unknown> =>
  Array.isArray(value) ||
  (ArrayBuffer.isView(value) && !(value instanceof DataView));

const itemText = (value: unknown): string => {
  const cell = cellValue(value);
  return cell === null ? "" : String(cell);
};

/** One table cell: numbers stay numbers; lists, references and objects become text. */
export function cellValue(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (isList(value)) {
    const items = Array.from(value);
    const shown = items.slice(0, MAX_ITEMS).map(itemText);
    if (items.length > MAX_ITEMS) shown.push("…");
    return `[${shown.join(", ")}]`;
  }
  if (isReference(value)) return value._REFERENCE.path;
  return JSON.stringify(value, (_, v) =>
    typeof v === "bigint" ? Number(v) : v,
  );
}

const columnType = (
  name: string,
  values: unknown[],
): Column<RowItem>["type"] => {
  if (name === "id") return "code";
  const present = values.filter((v) => v !== undefined && v !== null);
  if (
    present.length > 0 &&
    present.every((v) => typeof v === "number" || typeof v === "bigint")
  )
    return "number";
  if (present.some((v) => isList(v) || isReference(v))) return "code";
  return "text";
};

/** The library table's columns for the loaded columns, read from rows laid out as colnames; ragged columns are lists. */
export const tableColumns = (
  colnames: string[],
  names: string[],
  data: { [name: string]: unknown[] },
  lists: { [name: string]: (row: RowItem) => ListCell } = {},
): Column<RowItem>[] =>
  names.map((name) => {
    const index = colnames.indexOf(name);
    return {
      key: name,
      label: name,
      type: lists[name] ? "list" : columnType(name, data[name] ?? []),
      sortable: true,
      value: (row) => cellValue(row.columnValues[index]),
      list: lists[name],
    };
  });

const csvCell = (value: unknown): string => {
  if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
  if (typeof value === "number" || typeof value === "bigint")
    return String(value);
  return "";
};

/** Strings quoted, numbers as they are; a ragged column's lists in full, by file row; other lists empty. */
export const tableCsv = (
  colnames: string[],
  names: string[],
  rows: RowItem[],
  lists: { [name: string]: unknown[][] | null } = {},
): string => {
  const indexes = names.map((name) => colnames.indexOf(name));
  const cell = (row: RowItem, name: string, i: number) => {
    if (!(name in lists)) return csvCell(row.columnValues[i]);
    const values = lists[name]?.[Number(row.id)];
    return values ? csvList(values) : "";
  };
  return [
    names.join(","),
    ...rows.map((row) =>
      names.map((name, j) => cell(row, name, indexes[j])).join(","),
    ),
  ].join("\n");
};
