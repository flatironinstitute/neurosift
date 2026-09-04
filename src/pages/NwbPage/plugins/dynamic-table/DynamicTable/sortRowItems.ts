export type RowItem = {
  id: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columnValues: any[];
};

export type ColumnSort = {
  column: string;
  ascending: boolean;
};

export type ColumnSortState = {
  primary?: ColumnSort;
  secondary?: ColumnSort;
};

// Missing values (undefined) and NaN numbers sort to the end regardless of
// direction. Everything else is compared with < and >, which orders numbers
// numerically and strings lexicographically.
const isMissing = (v: unknown): boolean =>
  v === undefined || (typeof v === "number" && isNaN(v));

const compareValues = (a: unknown, b: unknown, ascending: boolean): number => {
  const aMissing = isMissing(a);
  const bMissing = isMissing(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = a as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y = b as any;
  if (x < y) return ascending ? -1 : 1;
  if (x > y) return ascending ? 1 : -1;
  return 0;
};

export const sortRowItems = (
  rowItems: RowItem[],
  columnNames: string[],
  sortState: ColumnSortState,
): RowItem[] => {
  const primary = sortState.primary;
  if (!primary) return rowItems;
  const primaryColIndex = columnNames.indexOf(primary.column);
  if (primaryColIndex < 0) return rowItems;
  const secondary = sortState.secondary;
  const secondaryColIndex = secondary
    ? columnNames.indexOf(secondary.column)
    : -1;
  const ret = [...rowItems];
  ret.sort((a, b) => {
    const c = compareValues(
      a.columnValues[primaryColIndex],
      b.columnValues[primaryColIndex],
      primary.ascending,
    );
    if (c !== 0) return c;
    if (secondaryColIndex >= 0 && secondary) {
      return compareValues(
        a.columnValues[secondaryColIndex],
        b.columnValues[secondaryColIndex],
        secondary.ascending,
      );
    }
    return 0;
  });
  return ret;
};
