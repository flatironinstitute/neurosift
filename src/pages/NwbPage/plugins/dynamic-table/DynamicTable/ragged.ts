/** A dataset of a DynamicTable group, as far as finding ragged columns needs. */
export type TableDataset = {
  name: string;
  shape: number[];
  attrs: { [key: string]: unknown };
};

/** A column whose rows hold lists: its data, and the indexes into it, outermost first. */
export type RaggedColumn = {
  name: string;
  indexes: string[];
  /** Shape of the data; past the first axis, each value is itself an array. */
  shape: number[];
  /** False when the column is missing from colnames and only an index points at it. */
  listed: boolean;
};

export type Range = [number, number];

/** Values a list cell shows before its detail row opens: shorter lists show whole. */
export const SHORT_LIST = 5;
/** Values the cell reads for its preview; CSS cuts it where the cell ends. */
export const PREVIEW_COUNT = 16;
/** Values the detail row lists before Show all. */
export const DETAIL_COUNT = 30;
/** A ragged column with more values than this is left out of CSV export. */
export const CSV_MAX_VALUES = 5_000_000;
const ROW_VALUES = 8;

const baseName = (path: string) => path.split("/").pop() ?? path;

const targetOf = (index: TableDataset): string => {
  const target = index.attrs.target as
    | { _REFERENCE?: { path?: string } }
    | undefined;
  const path = target?._REFERENCE?.path;
  return path ? baseName(path) : index.name.replace(/_index$/, "");
};

/** Ragged columns of a table: those in colnames in their order, then any only an index names. */
export const findRaggedColumns = (
  datasets: TableDataset[],
  colnames: string[],
): RaggedColumn[] => {
  const byName = new Map(datasets.map((ds) => [ds.name, ds]));
  const indexes = datasets.filter(
    (ds) => ds.attrs.neurodata_type === "VectorIndex",
  );
  const targeted = new Set(indexes.map(targetOf));
  const found: RaggedColumn[] = [];
  for (const top of indexes.filter((ix) => !targeted.has(ix.name))) {
    const chain = [top.name];
    let name = targetOf(top);
    while (
      byName.get(name)?.attrs.neurodata_type === "VectorIndex" &&
      !chain.includes(name)
    ) {
      chain.push(name);
      name = targetOf(byName.get(name)!);
    }
    const data = byName.get(name);
    if (!data || chain.includes(name)) continue;
    found.push({
      name,
      indexes: chain,
      shape: data.shape,
      listed: colnames.includes(name),
    });
  }
  const place = (c: RaggedColumn) =>
    c.listed ? colnames.indexOf(c.name) : colnames.length;
  return found.sort((a, b) => place(a) - place(b));
};

/** The rows of the next level that one row of an index spans. */
export const rowRange = (index: ArrayLike<number>, row: number): Range => [
  row === 0 ? 0 : Number(index[row - 1]),
  Number(index[row]),
];

/** How many entries each row of an index holds. */
export const listCounts = (index: ArrayLike<number>): number[] =>
  Array.from({ length: index.length }, (_, row) => {
    const [start, end] = rowRange(index, row);
    return end - start;
  });

/** The innermost lists of one row, as ranges of the data's first axis. */
export const leafRanges = (
  levels: ArrayLike<number>[],
  row: number,
): Range[] => {
  let ranges = [rowRange(levels[0], row)];
  for (const level of levels.slice(1)) {
    ranges = ranges.flatMap(([start, end]) =>
      Array.from({ length: end - start }, (_, i) => rowRange(level, start + i)),
    );
  }
  return ranges;
};

/** Values per entry of the first axis: 256 for waveforms of shape [n, 256]. */
export const rowSize = (shape: number[]) =>
  shape.slice(1).reduce((a, b) => a * b, 1);

/** Splits flat data read from `start` into one row's values; nested columns give a list per inner list. */
export const rowValues = (
  flat: ArrayLike<unknown>,
  start: number,
  ranges: Range[],
  shape: number[],
  nested: boolean,
): unknown[] => {
  const size = rowSize(shape);
  const items = ([a, b]: Range): unknown[] =>
    Array.from({ length: b - a }, (_, i) => {
      const at = (a - start + i) * size;
      return size === 1
        ? flat[at]
        : Array.from({ length: size }, (_, j) => flat[at + j]);
    });
  return nested ? ranges.map(items) : items(ranges[0]);
};

const count = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, word: string) =>
  `${count(n)} ${word}${n === 1 ? "" : "s"}`;

/** "1,652" or "1,652 × 256": the length of one list, with the shape of each value. */
export const listSize = (length: number, shape: number[]) =>
  [count(length), ...shape.slice(1).map(count)].join(" × ");

/** A number for reading: whole numbers as they are, others to `digits` places or significant digits. */
export const formatNumber = (value: number, digits: number): string => {
  if (!Number.isFinite(value) || Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-US", {
    useGrouping: false,
    ...(Math.abs(value) < 1
      ? { maximumSignificantDigits: digits }
      : { maximumFractionDigits: digits }),
  });
};

type Reference = { _REFERENCE: { path: string } };
const isReference = (value: unknown): value is Reference =>
  typeof value === "object" && value !== null && "_REFERENCE" in value;

const isList = (value: unknown): value is ArrayLike<unknown> =>
  Array.isArray(value) ||
  (ArrayBuffer.isView(value) && !(value instanceof DataView));

const scalar = (value: unknown, digits?: number): string => {
  if (typeof value === "bigint") value = Number(value);
  if (typeof value === "number")
    return digits === undefined ? String(value) : formatNumber(value, digits);
  if (isReference(value)) return value._REFERENCE.path;
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
};

/** One value for reading; an array shows its first eight values. */
export const formatValue = (value: unknown, digits: number): string => {
  if (!isList(value)) return scalar(value, digits);
  const items = Array.from(value);
  const shown = items.slice(0, ROW_VALUES).map((v) => formatValue(v, digits));
  if (items.length > ROW_VALUES) shown.push("…");
  return `[${shown.join(", ")}]`;
};

/** Values as the cell shows them, after the count. */
export const previewText = (values: unknown[], digits = 2) =>
  values.map((v) => formatValue(v, digits)).join(", ");

/** The first `limit` values, how many more, and the last; Infinity lists them all. */
export const detailText = (
  values: unknown[],
  limit = DETAIL_COUNT,
  digits = 3,
): string => {
  if (values.length <= limit + 1) return previewText(values, digits);
  const rest = values.length - limit - 1;
  return `${previewText(values.slice(0, limit), digits)}, … ${count(rest)} more … ${formatValue(values[values.length - 1], digits)}`;
};

/** Every value at full precision, arrays in brackets. */
export const fullText = (values: unknown[], separator = ", "): string =>
  values
    .map((v) =>
      isList(v) ? `[${fullText(Array.from(v), separator)}]` : scalar(v),
    )
    .join(separator);

/** A list as one quoted CSV field, values separated by semicolons. */
export const csvList = (values: unknown[]) =>
  `"${fullText(values, "; ").replace(/"/g, '""')}"`;

/** An index of an index by shape: "1,652 × 256", or "3 lists · 4,034 × 256" when it holds several. */
export const nestedSize = (
  column: RaggedColumn,
  levels: ArrayLike<number>[],
  row: number,
): string => {
  const ranges = leafRanges(levels, row);
  const total = ranges.reduce((n, [a, b]) => n + b - a, 0);
  const lists = ranges.length > 1 ? `${plural(ranges.length, "list")} · ` : "";
  return `${lists}${listSize(total, column.shape)}`;
};

/** What a list cell shows before its values load: the count, and for arrays their shape. */
export const cellSummary = (
  column: RaggedColumn,
  levels: ArrayLike<number>[],
  row: number,
): { count: string; values?: string; needsValues: boolean } => {
  const [start, end] = rowRange(levels[0], row);
  const length = end - start;
  if (length === 0) return { count: "0 values", needsValues: false };
  if (column.indexes.length > 1)
    return { count: nestedSize(column, levels, row), needsValues: false };
  if (column.shape.length > 1)
    return {
      count: count(length),
      values: `× ${column.shape.slice(1).map(count).join(" × ")}`,
      needsValues: false,
    };
  return { count: count(length), needsValues: true };
};

/** The detail row's heading after the column and row: "1,652 values, in seconds". */
export const detailSummary = (
  column: RaggedColumn,
  levels: ArrayLike<number>[],
  row: number,
  unit?: string,
): string => {
  const ranges = leafRanges(levels, row);
  const total = ranges.reduce((n, [a, b]) => n + b - a, 0);
  const size =
    column.indexes.length > 1
      ? nestedSize(column, levels, row)
      : listSize(total, column.shape);
  const plural = total === 1 && column.shape.length === 1 ? "" : "s";
  return `${size} value${plural}${unit ? `, in ${unit}` : ""}`;
};

/** Most values one preview read spans; rows farther apart are read separately. */
export const PREVIEW_SPAN = 1_000_000;

/** Groups rows whose previews lie close together, so each group is one read. */
export const previewBatches = (
  index: ArrayLike<number>,
  rows: number[],
  limit = PREVIEW_COUNT,
  maxSpan = PREVIEW_SPAN,
): { start: number; end: number; rows: number[] }[] => {
  const batches: { start: number; end: number; rows: number[] }[] = [];
  for (const row of [...rows].sort((a, b) => a - b)) {
    const [s, e] = rowRange(index, row);
    const end = Math.min(e, s + limit);
    const last = batches[batches.length - 1];
    if (last && Math.max(last.end, end) - last.start <= maxSpan) {
      last.end = Math.max(last.end, end);
      last.rows.push(row);
    } else batches.push({ start: s, end, rows: [row] });
  }
  return batches;
};

/** The note for columns left out of CSV export, up to the link to Python usage. */
export const csvLeftOut = (columns: { name: string; values: number }[]) => {
  const one = columns.length === 1;
  const sizes = columns.map((c) => `${c.name} has ${count(c.values)} values`);
  return `${sizes.join("; ")}, too many for CSV. Load ${one ? "it" : "them"} in Python instead: see`;
};
