/* eslint-disable @typescript-eslint/no-explicit-any */
import { ColumnSortState, RowItem, sortRowItems } from "./sortRowItems";
import { tableColumns, tableCsv } from "./dynamicTableColumns";
import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import {
  Button,
  type Column,
  DataTable,
  Disclosure,
  EmptyState,
  LoadingState,
  ViewPanel,
} from "@ui";
import {
  getHdf5Dataset,
  getHdf5DatasetData,
  useHdf5Group,
} from "@hdf5Interface";
import { DatasetDataType } from "@remote-h5-file";
import "./DynamicTable.css";

type Props = {
  nwbUrl: string;
  path: string;
};

type DataState = {
  [key: string]: any[];
};
type DataAction = {
  type: "set";
  key: string;
  data: any[];
};
const dataReducer = (state: DataState, action: DataAction) => {
  if (action.type === "set") {
    return {
      ...state,
      [action.key]: action.data,
    };
  } else return state;
};

type ColumnSortAction =
  | {
      type: "click";
      column: string;
    }
  | { type: "reset" };

const columnSortReducer = (
  state: ColumnSortState,
  action: ColumnSortAction,
): ColumnSortState => {
  if (action.type === "reset") return {};
  if (action.type === "click") {
    if (state.primary) {
      // the primary column is already set
      if (state.primary.column === action.column) {
        // the primary column is the same as the one that was clicked
        return {
          ...state,
          primary: {
            ...state.primary,
            ascending: !state.primary.ascending, // switch the sort order
          },
        };
      } else {
        // the primary column becomes the secondary column
        return {
          ...state,
          secondary: state.primary,
          primary: {
            column: action.column,
            ascending: true,
          },
        };
      }
    } else {
      // the primary column is not set
      return {
        ...state,
        primary: {
          column: action.column,
          ascending: true,
        },
      };
    }
  } else return state;
};

type ColumnDescriptions = {
  [colname: string]: string;
};

type ColumnDescriptionAction = {
  type: "set";
  column: string;
  description: string;
};

const columnDescriptionReducer = (
  state: ColumnDescriptions,
  action: ColumnDescriptionAction,
): ColumnDescriptions => {
  if (action.type === "set") {
    return {
      ...state,
      [action.column]: action.description,
    };
  } else return state;
};

const DESCRIPTION_COLUMNS: Column<{ name: string; description: string }>[] = [
  { key: "name", label: "Column", type: "code", value: (row) => row.name },
  {
    key: "description",
    label: "Description",
    value: (row) => row.description,
  },
];

const DynamicTable: FunctionComponent<Props> = ({ nwbUrl, path }) => {
  const [data, dataDispatch] = useReducer(dataReducer, {});
  const group = useHdf5Group(nwbUrl, path);
  const [columnSortState, columnSortDispatch] = useReducer(
    columnSortReducer,
    {},
  );
  const colnames = useMemo(() => {
    if (!group) return undefined;
    let c = group.attrs["colnames"] as string[];
    if (!c) return undefined;
    const idDataset = group.datasets.find((ds) => ds.name === "id");
    if (idDataset) {
      c = c.filter((name) => {
        const ds = group.datasets.find((ds) => ds.name === name);
        if (ds && ds.shape[0] !== idDataset.shape[0]) {
          // for example, event_times, event_amplitudes
          return false;
        }
        return true;
      });
    }
    if (!c.includes("id")) {
      if (group.datasets.find((ds) => ds.name === "id")) {
        c = ["id", ...c];
      }
    }
    return c;
  }, [group]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      if (!colnames) return;
      setLoading(true);
      let timer = Date.now();
      let toDispatch: { key: string; data: any[] }[] = [];
      for (const colname of colnames) {
        const ds0 = await getHdf5Dataset(nwbUrl, path + "/" + colname);
        if (!ds0) {
          console.warn(
            `In DynamicTableView, dataset not found: ${path}/${colname}`,
          );
          continue;
        }
        if (ds0.shape.length > 1) {
          console.warn(
            `In DynamicTableView, skipping dataset with shape > 1: ${path}/${colname} (${ds0.shape})`,
          );
          continue;
        }
        let d: DatasetDataType | any[] | undefined = await getHdf5DatasetData(
          nwbUrl,
          path + "/" + colname,
          {},
        );
        if (canceled) return;
        if (!d) {
          console.warn(
            `In DynamicTableView, dataset data not found: ${path}/${colname}`,
          );
          continue;
        }

        // See https://github.com/dandi/helpdesk/discussions/131 - that's why we squeeze
        const squeezedShape = ds0
          ? ds0.shape.length > 1
            ? ds0.shape.filter((s: number) => s > 1)
            : ds0.shape
          : [];
        if (squeezedShape.length !== 1) {
          if (squeezedShape.length === 2) {
            // in this case we are going to reshape the data
            // See: https://github.com/flatironinstitute/neurosift/issues/173
            const newD: any[][] = [];
            for (let i = 0; i < squeezedShape[0]; i++) {
              const entry = [];
              for (let j = 0; j < squeezedShape[1]; j++) {
                entry.push(d[i * squeezedShape[1] + j]);
              }
              newD.push(entry);
            }
            d = newD;
          } else {
            console.warn(
              `In DynamicTableView, unexpected shape for ${path}/${colname}`,
              ds0.shape,
            );
            continue;
          }
        }

        /* handle special case where dtype is unknown and we have the wrong number of elements */
        if (ds0.shape.length === 1) {
          if (ds0.shape[0] !== d.length) {
            const factor = d.length / ds0.shape[0];
            // check if factor is a perfect integer
            if (factor === Math.floor(factor)) {
              const d2 = [];
              for (let i = 0; i < ds0.shape[0]; i++) {
                d2.push(d.slice(i * factor, (i + 1) * factor));
              }
              d = d2 as any;
            }
          }
        }
        toDispatch.push({ key: colname, data: Array.from(d as any) });
        const elapsed = Date.now() - timer;
        if (elapsed > 500) {
          timer = Date.now();
          for (const { key, data } of toDispatch) {
            dataDispatch({ type: "set", key, data });
          }
          toDispatch = [];
        }
      }
      for (const { key, data } of toDispatch) {
        dataDispatch({ type: "set", key, data });
      }
      setLoading(false);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [colnames, nwbUrl, path]);

  const validColumnNames = useMemo(
    () => colnames?.filter((colname) => data[colname]),
    [colnames, data],
  );

  const rowItems: RowItem[] = useMemo(() => {
    if (!colnames) return [];
    let numRows = 0;
    for (const colname of colnames) {
      const d = data[colname];
      if (d) {
        numRows = Math.max(numRows, d.length);
      }
    }
    const ret: RowItem[] = [];
    for (let i = 0; i < numRows; i++) {
      ret.push({
        id: i,
        columnValues: colnames.map((colname) => data[colname]?.[i]),
      });
    }
    return ret;
  }, [colnames, data]);

  const sortedRowItems = useMemo(() => {
    if (!colnames) return rowItems;
    return sortRowItems(rowItems, colnames, columnSortState);
  }, [colnames, rowItems, columnSortState]);

  const [columnDescriptions, columnDescriptionDispatch] = useReducer(
    columnDescriptionReducer,
    {},
  );
  useEffect(() => {
    if (!group) return;
    for (const colname of colnames || []) {
      const ds = group.datasets.find((ds) => ds.name === colname);
      if (ds) {
        columnDescriptionDispatch({
          type: "set",
          column: colname,
          description: ds.attrs.description || "",
        });
      }
    }
  }, [colnames, group]);

  const [maxNumCellsToView, setMaxNumCellsToView] = useState(20_000);

  const sortedRowItemsAbbreviated = useMemo(() => {
    const maxLength = maxNumCellsToView / (colnames?.length || 1);
    if (sortedRowItems.length < maxLength) {
      return sortedRowItems;
    }
    const ret = [];
    for (let i = 0; i < maxLength; i++) {
      ret.push(sortedRowItems[i]);
    }
    return ret;
  }, [sortedRowItems, colnames, maxNumCellsToView]);

  const columns = useMemo(
    () =>
      colnames && validColumnNames
        ? tableColumns(colnames, validColumnNames, data)
        : [],
    [colnames, validColumnNames, data],
  );

  const name = path.split("/").pop() || path;
  const handleExportAsCsv = useCallback(() => {
    if (!colnames || !validColumnNames) return;
    const csv = tableCsv(colnames, validColumnNames, sortedRowItems);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [colnames, validColumnNames, sortedRowItems, name]);

  const [descriptionsOpen, setDescriptionsOpen] = useState(false);

  if (!group || !colnames || !validColumnNames)
    return <LoadingState label="Reading the table" phase="loading" />;
  if (colnames.length === 0)
    return (
      <EmptyState icon="data-table" title="This table has no columns">
        {`${path} lists no columns to show.`}
      </EmptyState>
    );
  if (validColumnNames.length === 0)
    return <LoadingState label="Reading the columns" phase="loading" />;

  const count = (n: number) => n.toLocaleString("en-US");
  const shown = sortedRowItemsAbbreviated.length;
  const total = sortedRowItems.length;
  const rows = total === 1 ? "row" : "rows";
  const columnCount = `${count(columns.length)} column${columns.length === 1 ? "" : "s"}`;
  const summary =
    shown < total
      ? `Showing ${count(shown)} of ${count(total)} rows and ${columnCount}`
      : `Showing all ${count(total)} ${rows} and ${columnCount}`;
  const descriptions = validColumnNames
    .filter((colname) => columnDescriptions[colname])
    .map((colname) => ({
      name: colname,
      description: columnDescriptions[colname],
    }));

  return (
    <ViewPanel
      label={name}
      summary={loading ? `${summary} · reading more columns` : summary}
      busy={loading}
      controls={
        <>
          {columnSortState.primary && (
            <Button
              size="sm"
              variant="ghost"
              icon="reset"
              onClick={() => columnSortDispatch({ type: "reset" })}
            >
              Original order
            </Button>
          )}
          <Button
            size="sm"
            icon="download"
            disabled={loading || total === 0}
            onClick={handleExportAsCsv}
          >
            Export as CSV
          </Button>
        </>
      }
    >
      <div className="dynamic-table">
        <DataTable
          caption={path}
          columns={columns}
          rows={sortedRowItemsAbbreviated}
          rowKey={(row) => String(row.id)}
          density="compact"
          sort={
            columnSortState.primary && {
              key: columnSortState.primary.column,
              direction: columnSortState.primary.ascending
                ? "ascending"
                : "descending",
            }
          }
          onSort={(sort) =>
            columnSortDispatch({ type: "click", column: sort.key })
          }
        />
      </div>
      <div className="dynamic-table-footer">
        {shown < total && (
          <Button
            size="sm"
            onClick={() => setMaxNumCellsToView((x) => x + 20_000)}
          >
            Show more rows
          </Button>
        )}
        {descriptions.length > 0 && (
          <Disclosure
            label={`Show column descriptions (${descriptions.length})`}
            expandedLabel="Hide column descriptions"
            open={descriptionsOpen}
            onToggle={setDescriptionsOpen}
          >
            <DataTable
              caption={`Column descriptions of ${path}`}
              columns={DESCRIPTION_COLUMNS}
              rows={descriptions}
              rowKey={(row) => row.name}
              density="compact"
            />
          </Disclosure>
        )}
      </div>
    </ViewPanel>
  );
};

export default DynamicTable;
