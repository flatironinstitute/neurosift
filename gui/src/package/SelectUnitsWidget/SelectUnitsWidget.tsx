import { useSortingCuration } from '../context-sorting-curation';
import { SortableTableWidget, SortableTableWidgetRow } from '../component-sortable-table';
import React, { FunctionComponent, useEffect, useMemo } from 'react';
import { ColorPatchUnitIdLabel, ColorPatchUnitLabelProps, mergeGroupForUnitId } from '../component-sortable-table';
import { idToNum, INITIALIZE_UNITS, sortIds, SortingRule, UnitSelectionAction } from '../context-unit-selection';


export type SelectUnitsWidgetProps = {
    unitIds: (number | string)[]
    selectedUnitIds: Set<number | string>,
    currentUnitId: number | string | undefined
    orderedUnitIds: (number | string)[],
    visibleUnitIds?: (number | string)[],
    primarySortRule?: SortingRule,
    unitIdSelectionDispatch: (action: UnitSelectionAction) => void,
    checkboxClickHandlerGenerator: (rowId: number | string) => (evt: React.MouseEvent) => void
    selectionDisabled?: boolean
}

const SelectUnitsWidget: FunctionComponent<SelectUnitsWidgetProps> = (props: SelectUnitsWidgetProps) => {
    const { unitIds, orderedUnitIds, visibleUnitIds, selectedUnitIds, currentUnitId, primarySortRule, checkboxClickHandlerGenerator, unitIdSelectionDispatch, selectionDisabled }  = props
    const {sortingCuration} = useSortingCuration()

    const columns = useMemo(() => ([
        {
            columnName: '_unitId',
            label: 'Unit',
            tooltip: 'Unit ID',
            sort: (a: any, b: any) => (idToNum(a) - idToNum(b)),
            dataElement: (d: ColorPatchUnitLabelProps) => (<ColorPatchUnitIdLabel unitId={d.unitId} mergeGroup={d.mergeGroup}/>),
            calculating: false
        }
    ]), [])

    const rows = useMemo(() => (
        unitIds.map(id => {
            const unitIdData = {
                value: {unitId: id, mergeGroup: mergeGroupForUnitId(id, sortingCuration)},
                sortValue: id
            }
            const rowData = {
                _unitId: unitIdData
            }
            return {
                rowId: id,
                data: rowData,
                checkboxFn: checkboxClickHandlerGenerator(id)
            }
        })
    ), [unitIds, sortingCuration, checkboxClickHandlerGenerator])

    useEffect(() => {
        unitIdSelectionDispatch({ type: INITIALIZE_UNITS, newUnitOrder: sortIds(rows.map(r => r.rowId)) })
    }, [rows, unitIdSelectionDispatch])

    const rowMap = useMemo(() => {
        const draft = new Map<number | string, SortableTableWidgetRow>()
        rows.forEach(r => draft.set(r.rowId, r))
        return draft
    }, [rows])

    return (
        <SortableTableWidget
            selectedUnitIds={selectedUnitIds}
            currentUnitId={currentUnitId}
            selectionDispatch={unitIdSelectionDispatch}
            columns={columns}
            rows={rowMap}
            orderedUnitIds={orderedUnitIds}
            visibleUnitIds={visibleUnitIds}
            selectionDisabled={selectionDisabled}
            primarySortRule={primarySortRule}
        />
    )
}

export default SelectUnitsWidget