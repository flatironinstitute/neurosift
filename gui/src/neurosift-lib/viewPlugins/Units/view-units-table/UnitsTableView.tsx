import React, {
  FunctionComponent,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  idToNum,
  INITIALIZE_UNITS,
  sortIds,
  UNIQUE_SELECT_FIRST,
  UNIQUE_SELECT_LAST,
  UNIQUE_SELECT_NEXT,
  UNIQUE_SELECT_PREVIOUS,
  useSelectedUnitIds,
} from "../../../contexts/context-unit-selection";
import {
  ColorPatchUnitIdLabel,
  ColorPatchUnitLabelProps,
  mergeGroupForUnitId,
  SortableTableWidget,
  SortableTableWidgetColumn,
  SortableTableWidgetRow,
} from "../component-sortable-table";
import {
  defaultUnitsTableBottomToolbarOptions,
  UnitsTableBottomToolbar,
  UnitsTableBottomToolbarOptions,
} from "../../../misc/ViewToolbar";
import { UnitsTableViewData } from "./UnitsTableViewData";
import { useSortingCuration } from "../../../contexts/context-sorting-curation";

type Props = {
  data: UnitsTableViewData;
  width: number;
  height: number;
};

const UnitsTableView: FunctionComponent<Props> = ({ data, width, height }) => {
  const [toolbarOptions, setToolbarOptions] =
    useState<UnitsTableBottomToolbarOptions>({
      ...defaultUnitsTableBottomToolbarOptions,
      onlyShowSelected: false,
    });
  const {
    selectedUnitIds,
    currentUnitId,
    orderedUnitIds,
    visibleUnitIds,
    primarySortRule,
    checkboxClickHandlerGenerator,
    unitIdSelectionDispatch,
  } = useSelectedUnitIds();
  const { sortingCuration } = useSortingCuration();

  const visibleUnitIds2 = useMemo(
    () =>
      toolbarOptions.onlyShowSelected
        ? visibleUnitIds
          ? visibleUnitIds.filter((id) => selectedUnitIds.has(id))
          : [...selectedUnitIds]
        : visibleUnitIds,
    [visibleUnitIds, selectedUnitIds, toolbarOptions.onlyShowSelected],
  );

  const columns = useMemo(() => {
    const ret: SortableTableWidgetColumn[] = [];
    ret.push({
      columnName: "_unitId",
      label: "Unit",
      tooltip: "Unit ID",
      sort: (a: any, b: any) => idToNum(a) - idToNum(b),
      dataElement: (d: ColorPatchUnitLabelProps) => (
        <ColorPatchUnitIdLabel unitId={d.unitId} mergeGroup={d.mergeGroup} />
      ),
      calculating: false,
    });
    if (sortingCuration) {
      ret.push({
        columnName: "_labels",
        label: "Labels",
        tooltip: "Curation labels",
        sort: (a: any, b: any) => (a < b ? -1 : a > b ? 1 : 0),
        dataElement: (d: any) => <span>{d.join(", ")}</span>,
        calculating: false,
      });
    }
    if (data.similarityScores) {
      ret.push({
        columnName: "_similarity",
        label: "Similarity",
        tooltip: "Similarity with current unit",
        sort: (
          a: { score: number | undefined; unitId: number | string },
          b: { score: number | undefined; unitId: number | string },
        ) => {
          if (a.unitId === currentUnitId) return 1;
          if (b.unitId === currentUnitId) return -1;
          const s1 = a.score;
          const s2 = b.score;
          if (s1 === undefined && s2 !== undefined) return -1;
          else if (s1 !== undefined && s2 === undefined) return 1;
          else if (s1 === undefined && s2 === undefined) return 0;
          else if (s1 !== undefined && s2 !== undefined) {
            return s1 < s2 ? -1 : s1 > s2 ? 1 : 0;
          } else return 0;
        },
        dataElement: (d: any) => <span>{d}</span>,
        calculating: false,
        onlyAllowDescendingSort: true,
      });
    }
    // The filter is rather hacky
    data.columns
      .filter((c) => c.key !== "unitId")
      .forEach((c) => {
        ret.push({
          columnName: c.key,
          label: c.label,
          tooltip: c.label,
          sort: (a: any, b: any) => a - b,
          dataElement: (d: any) => <span>{d}</span>,
          calculating: false,
        });
      });
    return ret;
  }, [data.columns, currentUnitId, sortingCuration, data.similarityScores]);

  const rows = useMemo(() => {
    // depend on orderedUnitIds so we can trigger re-render when unit colors have been redistributed
    for (let i = 0; i < 0; i++) {
      orderedUnitIds.push("never-added");
    }
    const similarityScoresWithCurrentUnit: { [key: string | number]: number } =
      {};
    if (data.similarityScores) {
      if (currentUnitId !== undefined) {
        for (const a of data.similarityScores) {
          if (a.unitId1 === currentUnitId) {
            similarityScoresWithCurrentUnit[a.unitId2] = a.similarity;
          } else if (a.unitId2 === currentUnitId) {
            similarityScoresWithCurrentUnit[a.unitId1] = a.similarity;
          }
        }
      }
    }
    return data.rows.map((r) => {
      const curationLabels =
        (sortingCuration?.labelsByUnit || {})[`${r.unitId}`] || [];
      const unitIdData = {
        value: {
          unitId: r.unitId,
          mergeGroup: mergeGroupForUnitId(r.unitId, sortingCuration),
        },
        sortValue: r.unitId,
      };
      const similarityScore = similarityScoresWithCurrentUnit[r.unitId];
      const rowData: { [key: string]: any } = {
        _unitId: unitIdData,
        _labels: {
          value: curationLabels,
          sortValue: curationLabels.join(", "),
        },
        _similarity: {
          value:
            similarityScore !== undefined
              ? similarityScore.toFixed(3)
              : undefined,
          sortValue: {
            unitId: r.unitId,
            score: similarityScore,
          },
        },
      };
      for (const c of data.columns) {
        const text = `${r.values[c.key] !== undefined ? r.values[c.key] : ""}`;
        rowData[c.key] = {
          value: text,
          sortValue: r.values[c.key],
        };
      }
      return {
        rowId: r.unitId,
        data: rowData,
        // checkboxFn: !toolbarOptions.onlyShowSelected ? checkboxClickHandlerGenerator(r.unitId) : undefined
        checkboxFn: checkboxClickHandlerGenerator(r.unitId),
      };
    });
  }, [
    data.rows,
    data.columns,
    currentUnitId,
    data.similarityScores,
    sortingCuration,
    checkboxClickHandlerGenerator,
    orderedUnitIds,
  ]);

  useEffect(() => {
    unitIdSelectionDispatch({
      type: INITIALIZE_UNITS,
      newUnitOrder: sortIds(rows.map((r) => r.rowId)),
    });
  }, [rows, unitIdSelectionDispatch]);

  const rowMap = useMemo(() => {
    const draft = new Map<number | string, SortableTableWidgetRow>();
    rows.forEach((r) => draft.set(r.rowId, r));
    return draft;
  }, [rows]);

  const bottomToolbarHeight = 30;

  const divStyle: React.CSSProperties = useMemo(
    () => ({
      width: width - 20, // leave room for the scrollbar
      height: height - bottomToolbarHeight,
      top: 0,
      position: "relative",
      overflowY: "auto",
    }),
    [width, height],
  );

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.ctrlKey) {
        if (e.key === "ArrowDown") {
          unitIdSelectionDispatch({
            type: UNIQUE_SELECT_NEXT,
          });
        } else if (e.key === "ArrowUp") {
          unitIdSelectionDispatch({
            type: UNIQUE_SELECT_PREVIOUS,
          });
        } else if (e.key === "Home") {
          unitIdSelectionDispatch({
            type: UNIQUE_SELECT_FIRST,
          });
        } else if (e.key === "End") {
          unitIdSelectionDispatch({
            type: UNIQUE_SELECT_LAST,
          });
        }
        return false;
      }
    },
    [unitIdSelectionDispatch],
  );

  // const handleRedistributeUnitColors = useCallback(() => {
  //     unitIdSelectionDispatch({type: 'REDISTRIBUTE_UNIT_COLORS'})
  // }, [unitIdSelectionDispatch])

  return (
    <div>
      <div style={divStyle} onKeyDown={handleKeyDown}>
        <SortableTableWidget
          columns={columns}
          rows={rowMap}
          orderedUnitIds={orderedUnitIds}
          visibleUnitIds={visibleUnitIds2}
          selectedUnitIds={selectedUnitIds}
          currentUnitId={currentUnitId}
          selectionDispatch={unitIdSelectionDispatch}
          primarySortRule={primarySortRule}
          // hideSelectionColumn={toolbarOptions.onlyShowSelected}
        />
      </div>
      <div
        style={{
          position: "absolute",
          top: height - bottomToolbarHeight,
          height: bottomToolbarHeight,
          overflow: "hidden",
        }}
      >
        <UnitsTableBottomToolbar
          options={toolbarOptions}
          setOptions={setToolbarOptions}
          // onRedistributeUnitColors={handleRedistributeUnitColors}
        />
      </div>
    </div>
  );
};

export default UnitsTableView;
