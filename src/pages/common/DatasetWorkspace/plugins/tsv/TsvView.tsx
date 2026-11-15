import ViewError from "@components/ViewError/ViewError";
import { Button, DataTable, EmptyState, LoadingState, type Sort } from "@ui";
import { FunctionComponent, useMemo, useState } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import useCopyText from "../useCopyText";
import useDatasetFileText from "../useDatasetFileText";
import { parseTsv, sortRows, tsvColumns } from "./tsvTable";
import "./TsvView.css";

const TsvView: FunctionComponent<DatasetPluginProps> = ({ file }) => {
  const { text, error } = useDatasetFileText(file.urls[0]);
  const copy = useCopyText();
  const [sort, setSort] = useState<Sort>();
  const table = useMemo(
    () => (text === undefined ? undefined : parseTsv(text)),
    [text],
  );
  const columns = useMemo(
    () => (table && "rows" in table ? tsvColumns(table) : []),
    [table],
  );
  const rows = useMemo(
    () => (table && "rows" in table ? sortRows(table.rows, sort) : []),
    [table, sort],
  );

  const failure = error ?? (table && "error" in table ? table.error : null);
  if (failure) return <ViewError what="this file" error={failure} />;
  if (text === undefined || !table)
    return <LoadingState label="Loading the table" phase="loading" />;
  if (rows.length === 0)
    return (
      <EmptyState icon="data-table" title="This table has no rows">
        {`${file.filename} has a header row and no data.`}
      </EmptyState>
    );

  const count = `Showing all ${rows.length.toLocaleString("en-US")} rows and ${columns.length.toLocaleString("en-US")} columns`;
  return (
    <section className="tsv-view" aria-label={file.filename}>
      <div className="tsv-view-bar">
        <p className="tsv-view-count">{count}</p>
        {sort && (
          <Button
            size="sm"
            variant="ghost"
            icon="reset"
            onClick={() => setSort(undefined)}
          >
            Original order
          </Button>
        )}
        <Button
          size="sm"
          icon="copy"
          onClick={() => copy(text, "Table copied")}
        >
          Copy table
        </Button>
      </div>
      <div className="tsv-view-table">
        <DataTable
          caption={file.filename}
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.index)}
          density="compact"
          sort={sort}
          onSort={setSort}
        />
      </div>
    </section>
  );
};

export default TsvView;
