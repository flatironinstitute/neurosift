import { Checkbox } from '@material-ui/core'
import React, { FunctionComponent } from 'react'
import './SortableTableWidget.css'

type CheckboxProps = {
    rowId: string | number,
    selected: boolean,
    onClick: (evt: React.MouseEvent) => void,
    isIndeterminate?: boolean,
    isDisabled?: boolean
}

export const SortableTableWidgetCheckbox: FunctionComponent<CheckboxProps> = (props: CheckboxProps) => {
    const { rowId, selected, onClick, isIndeterminate, isDisabled } = props
    return (
        <Checkbox
            checked={selected}
            indeterminate={isIndeterminate}
            onClick={onClick}
            className={'SortableTableCheckbox'}
            title={`${selected ? 'Deselect' : 'Select'} ${rowId}` }
            disabled={isDisabled}
            size="small"
        />
    )
}


export default SortableTableWidgetCheckbox
