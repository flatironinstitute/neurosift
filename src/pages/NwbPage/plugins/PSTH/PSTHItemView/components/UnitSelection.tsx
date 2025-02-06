import { FunctionComponent } from "react";
import { DirectSpikeTrainsClient } from "../DirectSpikeTrainsClient";

type UnitsSelectionProps = {
  unitIds?: (number | string)[];
  selectedUnitIds: (number | string)[];
  setSelectedUnitIds: (x: (number | string)[]) => void;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  sortUnitsByValues: { [unitId: string | number]: number | string } | undefined;
  spikeTrainsClient: DirectSpikeTrainsClient | undefined;
};

const UnitSelectionComponent: FunctionComponent<UnitsSelectionProps> = ({
  unitIds,
  selectedUnitIds,
  setSelectedUnitIds,
  sortUnitsByVariable,
  sortUnitsByValues,
  spikeTrainsClient,
}) => {
  if (!unitIds) return <div>Loading unit IDs...</div>;
  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th style={{ width: 10 }}>
            <input
              type="checkbox"
              checked={
                unitIds.length > 0 && selectedUnitIds.length === unitIds.length
              }
              onChange={() => {}}
              onClick={() => {
                if (selectedUnitIds.length > 0) {
                  setSelectedUnitIds([]);
                } else {
                  setSelectedUnitIds(unitIds);
                }
              }}
            />
          </th>
          <th>Unit ID</th>
          <th># spikes</th>
          {sortUnitsByVariable && <th>{sortUnitsByVariable[0]}</th>}
        </tr>
      </thead>
      <tbody>
        {unitIds.map((unitId) => (
          <tr key={unitId}>
            <td>
              <input
                type="checkbox"
                checked={selectedUnitIds.includes(unitId)}
                onChange={() => {}}
                onClick={() => {
                  if (selectedUnitIds.includes(unitId)) {
                    setSelectedUnitIds(
                      selectedUnitIds.filter((x) => x !== unitId),
                    );
                  } else {
                    setSelectedUnitIds([...selectedUnitIds, unitId]);
                  }
                }}
              />
            </td>
            <td>{unitId}</td>
            <td>
              {spikeTrainsClient
                ? spikeTrainsClient.numSpikesForUnit(unitId)
                : ""}
            </td>
            {sortUnitsByVariable && (
              <td>{sortUnitsByValues ? sortUnitsByValues[unitId] : ""}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default UnitSelectionComponent;
