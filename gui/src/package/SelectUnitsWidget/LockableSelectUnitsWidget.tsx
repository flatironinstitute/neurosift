import { FormControlLabel, FormGroup, Switch, Typography } from '@mui/material';
import React, { Fragment, FunctionComponent } from 'react';
import SelectUnitsWidget, { SelectUnitsWidgetProps } from './SelectUnitsWidget';

type LockableSelectUnitsWidgetProps = SelectUnitsWidgetProps & {
    locked: boolean
    toggleLockStateCallback: () => void
}

const LockableSelectUnitsWidget: FunctionComponent<LockableSelectUnitsWidgetProps> = (props: LockableSelectUnitsWidgetProps) => {
    const { locked, toggleLockStateCallback } = props
    return (
        <Fragment>
            <FormGroup className={"lock-switch"}>
                <FormControlLabel
                    control={ <Switch checked={locked} size={"small"} onChange={() => toggleLockStateCallback()} /> }
                    label={<Typography variant="caption">Lock selection</Typography>}
                />
            </FormGroup>
            <SelectUnitsWidget
                {...props}
                selectionDisabled={locked}
            />
        </Fragment>
    )
}

export default LockableSelectUnitsWidget