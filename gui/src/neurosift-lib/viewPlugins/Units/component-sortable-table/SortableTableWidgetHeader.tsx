import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Grid,
  LinearProgress,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  SortingRule,
  TOGGLE_SELECT_ALL,
  UnitSelectionAction,
  UnitSelectionState,
  UPDATE_SORT_FIELDS,
} from "../../../contexts/context-unit-selection";
import React, { FunctionComponent, useCallback, useMemo } from "react";
import "./SortableTableWidget.css";
import SortableTableWidgetCheckbox from "./SortableTableWidgetCheckbox";
import {
  ColsDict,
  RowsDict,
  SortableTableWidgetColumn,
} from "./SortableTableWidgetTypes";

type HeaderRowProps = {
  columns: SortableTableWidgetColumn[];
  primarySortRule?: SortingRule;
  allUnitSelectionStatus: UnitSelectionState;
  rowSorterCallback: RowSorterCallback;
  selectionDispatch: React.Dispatch<UnitSelectionAction>;
  selectionDisabled?: boolean;
  hideSelectionColumn?: boolean;
};

type ColumnHeaderInfo = {
  name: string;
  tooltip?: string;
  label?: string;
  isCalculating: boolean;
  isPrimarySort: boolean;
  isAscendingSort: boolean;
};

const SortCaret = (ascending?: boolean) =>
  ascending ? (
    <FontAwesomeIcon icon={faCaretUp} />
  ) : (
    <FontAwesomeIcon icon={faCaretDown} />
  );

type RowSorterCallback = (
  colsMap: ColsDict,
) => (rules: SortingRule[]) => (number | string)[];
export const sorterCallbackWrapper = (
  rowsMap: RowsDict,
  colsMap: ColsDict,
): ((rules: SortingRule[]) => (number | string)[]) => {
  return (rules: SortingRule[]) => sortRows(rowsMap, colsMap, rules);
};
const sortRows = (
  rowsMap: RowsDict,
  colsMap: ColsDict,
  rules: SortingRule[],
) => {
  const _draft = Array.from(rowsMap.values());
  rules.forEach((rule) => {
    const columnName = rule.columnName;
    const column = colsMap.get(columnName);
    // NOTE: This sorting procedure can break, if different table instances have different sets of fields (e.g. a SelectUnitsWidget vs a UnitsTable).
    // Skipping undefined columns prevents a crash, but sorting results might not be completely honored if we're sorting on a column that
    // has ties, and the appropriate tie-breaking field doesn't exist on the table instance actively doing the sorting.
    //    Practically speaking, this can't happen at present, because it can only affect the SelectUnitsWidget, which only has a (unique)
    // _unitId column, so there can never be any ties to break.
    if (column) {
      _draft.sort((a, b) => {
        const aValue = (a.data[columnName] || {}).sortValue;
        const bValue = (b.data[columnName] || {}).sortValue;
        return rule.sortAscending
          ? column.sort(aValue, bValue)
          : column.sort(bValue, aValue);
      });
    }
  });
  return _draft.map((row) => row.rowId);
};

const getColumnNameDict = (
  columns: SortableTableWidgetColumn[],
): Map<string, SortableTableWidgetColumn> => {
  const map = new Map<string, SortableTableWidgetColumn>();
  columns.forEach((c) => map.set(c.columnName, c));
  return map;
};

const mapColumnsToHeaderInfo = (
  columns: SortableTableWidgetColumn[],
  primarySortRule?: SortingRule,
): ColumnHeaderInfo[] => {
  return columns.map((c) => ({
    name: c.columnName,
    tooltip: c.tooltip,
    label: c.label,
    isCalculating: c.calculating || false,
    isPrimarySort: c.columnName === primarySortRule?.columnName,
    isAscendingSort: primarySortRule?.sortAscending || false,
  }));
};

const SortableTableWidgetHeaderRow: FunctionComponent<HeaderRowProps> = (
  props,
) => {
  const {
    columns,
    selectionDispatch,
    primarySortRule,
    allUnitSelectionStatus,
    rowSorterCallback,
    selectionDisabled,
    hideSelectionColumn,
  } = props;
  const columnsMap = useMemo(() => getColumnNameDict(columns), [columns]);
  const columnHeaders = useMemo(
    () => mapColumnsToHeaderInfo(columns, primarySortRule),
    [columns, primarySortRule],
  );

  const toggleSelectAllCallback = useCallback(
    () => selectionDispatch({ type: TOGGLE_SELECT_ALL }),
    [selectionDispatch],
  );
  // We don't want the headers to have to worry about the row contents, but it makes sense for sorting logic to live with
  // the columns. So we have the SortableTableWidget parent give us a memoized function that has the rows in it already.
  // Then we use our own callback that changes only when that, or the columns map, changes; this one takes a set of rules
  // and uses the wrapped function (with the rows) and the columns (which we know here) to call the sortRows function
  // defined above. The result is a function mapping the set of rules to the ID ordering. That function is suitable for
  // passing to the reducer.
  const sortCallback = useCallback(
    (rules: SortingRule[]) => rowSorterCallback(columnsMap)(rules),
    [rowSorterCallback, columnsMap],
  );

  const handleColumnClick = useCallback(
    (columnName: string) => {
      if (selectionDisabled) return;
      selectionDispatch({
        type: UPDATE_SORT_FIELDS,
        newSortField: columnName,
        sortCallback: sortCallback,
        ascending: columnsMap.get(columnName)?.onlyAllowDescendingSort
          ? false
          : undefined,
      });
    },
    [selectionDispatch, sortCallback, selectionDisabled, columnsMap],
  );

  const _renderedHeaders = useMemo(() => {
    return columnHeaders.map((column) => {
      const tooltip =
        (column.tooltip || column.label || "") + " (click to sort)";
      return (
        <TableCell
          key={column.name}
          onClick={() => handleColumnClick(column.name)}
          title={tooltip}
          style={{ cursor: "pointer" }}
        >
          <Grid
            container
            justifyContent="flex-start"
            style={{ flexFlow: "row" }}
          >
            <Grid item key="icon">
              <span className={"SortCaretSpan"}>
                {column.isPrimarySort && SortCaret(column.isAscendingSort)}
              </span>
            </Grid>
            <Grid item key="text">
              <span>
                <span key="label">{column.label}</span>
                <span key="progress">
                  {column.isCalculating && <LinearProgress />}
                </span>
              </span>
            </Grid>
          </Grid>
        </TableCell>
      );
    });
  }, [columnHeaders, handleColumnClick]);

  return (
    <TableHead>
      <TableRow>
        {!hideSelectionColumn && (
          <TableCell key="_checkbox" width="30px">
            <SortableTableWidgetCheckbox
              rowId={"all"}
              selected={
                allUnitSelectionStatus === "all" ||
                allUnitSelectionStatus === "partial"
              }
              onClick={toggleSelectAllCallback}
              isIndeterminate={allUnitSelectionStatus === "partial"}
              isDisabled={selectionDisabled}
            />
          </TableCell>
        )}
        {_renderedHeaders}
      </TableRow>
    </TableHead>
  );
};

export default SortableTableWidgetHeaderRow;
