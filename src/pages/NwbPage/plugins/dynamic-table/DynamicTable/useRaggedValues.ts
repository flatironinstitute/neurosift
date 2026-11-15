import { useCallback, useEffect, useReducer, useRef } from "react";
import { getHdf5DatasetData } from "@hdf5Interface";
import {
  CSV_MAX_VALUES,
  PREVIEW_COUNT,
  type RaggedColumn,
  cellSummary,
  leafRanges,
  previewBatches,
  rowRange,
  rowSize,
  rowValues,
} from "./ragged";

/** Index levels per ragged column, outermost first. */
export type RaggedIndexes = { [column: string]: number[][] };

type Previews = { [column: string]: { [row: number]: unknown[] } };
type PreviewAction = { column: string; row: number; values: unknown[] };

const previewReducer = (state: Previews, a: PreviewAction): Previews => ({
  ...state,
  [a.column]: { ...state[a.column], [a.row]: a.values },
});

/** Reads one row of a ragged column; `limit` cuts a plain list to its first values. */
export const readRaggedRow = async (
  nwbUrl: string,
  path: string,
  column: RaggedColumn,
  levels: number[][],
  row: number,
  limit?: number,
): Promise<unknown[]> => {
  const ranges = leafRanges(levels, row);
  if (ranges.length === 0) return [];
  const start = ranges[0][0];
  let end = ranges[ranges.length - 1][1];
  const nested = column.indexes.length > 1;
  if (limit !== undefined && !nested) {
    end = Math.min(end, start + limit);
    ranges[0] = [start, end];
  }
  if (end <= start) return nested ? ranges.map(() => []) : [];
  const flat = await getHdf5DatasetData(nwbUrl, `${path}/${column.name}`, {
    slice: [[start, end]],
  });
  if (!flat) throw new Error(`Couldn’t read ${path}/${column.name}`);
  return rowValues(flat, start, ranges, column.shape, nested);
};

/** Values for CSV export: every row's list, or undefined for a column too large to write. */
export const readRaggedColumn = async (
  nwbUrl: string,
  path: string,
  column: RaggedColumn,
  levels: number[][],
): Promise<unknown[][] | undefined> => {
  const total = (column.shape[0] ?? 0) * rowSize(column.shape);
  if (total > CSV_MAX_VALUES) return undefined;
  const flat = await getHdf5DatasetData(nwbUrl, `${path}/${column.name}`, {});
  if (!flat) return undefined;
  const nested = column.indexes.length > 1;
  return levels[0].map((_, row) =>
    rowValues(flat, 0, leafRanges(levels, row), column.shape, nested),
  );
};

/** First values of each visible row, read once per row and column; rows that appear together share a read. */
export const useRaggedPreviews = (
  nwbUrl: string,
  path: string,
  columns: RaggedColumn[],
  indexes: RaggedIndexes,
) => {
  const [previews, dispatch] = useReducer(previewReducer, {});
  const requested = useRef(new Set<string>());
  const visible = useRef(new Set<number>());
  const pending = useRef(new Set<number>());
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const flush = useCallback(() => {
    const rows = [...pending.current];
    pending.current.clear();
    for (const column of columns) {
      const levels = indexes[column.name];
      if (!levels) continue;
      const wanted = rows.filter(
        (row) =>
          !requested.current.has(`${column.name}:${row}`) &&
          cellSummary(column, levels, row).needsValues,
      );
      wanted.forEach((row) => requested.current.add(`${column.name}:${row}`));
      for (const batch of previewBatches(levels[0], wanted)) {
        getHdf5DatasetData(nwbUrl, `${path}/${column.name}`, {
          slice: [[batch.start, batch.end]],
        })
          .then((flat) => {
            if (!flat) throw new Error("No data");
            for (const row of batch.rows) {
              const [s, e] = rowRange(levels[0], row);
              const end = Math.min(e, s + PREVIEW_COUNT);
              const values = Array.prototype.slice.call(
                flat,
                s - batch.start,
                end - batch.start,
              );
              dispatch({ column: column.name, row, values });
            }
          })
          .catch((err) => {
            batch.rows.forEach((row) =>
              requested.current.delete(`${column.name}:${row}`),
            );
            console.warn(`Couldn’t read ${column.name}`, err);
          });
      }
    }
  }, [nwbUrl, path, columns, indexes]);

  const load = useCallback(
    (rows: Iterable<number>) => {
      for (const row of rows) pending.current.add(row);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, 0);
    },
    [flush],
  );

  // Rows can scroll into view before their indexes arrive; read them once they do.
  useEffect(() => {
    load(visible.current);
  }, [load]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onRowVisible = useCallback(
    (key: string) => {
      visible.current.add(Number(key));
      load([Number(key)]);
    },
    [load],
  );
  return { previews, onRowVisible };
};
