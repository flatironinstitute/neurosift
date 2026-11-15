import type { Column, Sort } from "@ui";

export type TsvRow = { index: number; cells: string[] };
type TsvTable = { headers: string[]; rows: TsvRow[] };

const ID_LIKE = /(^|_)id$/i;
const isMissing = (cell: string) => cell === "" || cell === "n/a";

export const parseTsv = (text: string): TsvTable | { error: string } => {
  const lines = text.trim().split("\n");
  const headers = lines[0].split("\t");
  const rows = lines
    .slice(1)
    .map((line, index) => ({ index, cells: line.split("\t") }));
  if (rows.some((row) => row.cells.length !== headers.length))
    return { error: "Malformed TSV: Inconsistent number of columns" };
  return { headers, rows };
};

/** IDs in the code face; numbers when every value present parses as one. BIDS writes n/a for missing. */
export const tsvColumns = ({ headers, rows }: TsvTable): Column<TsvRow>[] =>
  headers.map((label, index) => {
    const present = rows
      .map((row) => row.cells[index])
      .filter((cell) => !isMissing(cell));
    const type = ID_LIKE.test(label)
      ? "code"
      : present.length > 0 && present.every((cell) => !isNaN(Number(cell)))
        ? "number"
        : "text";
    return {
      key: String(index),
      label,
      type,
      sortable: true,
      value: (row) => {
        const cell = row.cells[index];
        if (isMissing(cell)) return null;
        return type === "number" ? Number(cell) : cell;
      },
    };
  });

export const sortRows = (rows: TsvRow[], sort?: Sort): TsvRow[] => {
  if (!sort) return rows;
  const column = Number(sort.key);
  const sign = sort.direction === "ascending" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const valueA = a.cells[column];
    const valueB = b.cells[column];
    const numA = Number(valueA);
    const numB = Number(valueB);
    if (!isNaN(numA) && !isNaN(numB)) return sign * (numA - numB);
    return sign * valueA.localeCompare(valueB);
  });
};
