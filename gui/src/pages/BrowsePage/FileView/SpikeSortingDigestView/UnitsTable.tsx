import { FunctionComponent } from "react";
import { useSelectedUnitIds } from "../../../../package/context-unit-selection";
import "./units-table.css"

type Props = {
    unitIds: (number | string)[]
}

const UnitsTable: FunctionComponent<Props> = ({unitIds}) => {
    const {selectedUnitIds, unitIdSelectionDispatch} = useSelectedUnitIds()
    const classNameForUnit = (unitId: number | string) => {
        if (selectedUnitIds.has(unitId)) {
            return 'selected'
        }
        else {
            return ''
        }
    }
    return (
        <div>
            <table className="units-table">
                <thead>
                    <tr>
                        <th>Unit</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        unitIds.map((unitId) => (
                            <tr key={unitId} style={{cursor: 'pointer'}} className={classNameForUnit(unitId)} onClick={() => [
                                unitIdSelectionDispatch({type: 'SET_SELECTION', incomingSelectedUnitIds: [unitId]})
                            ]}>
                                <td>
                                    {unitId}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

export default UnitsTable