import { Checkbox, LoadingState } from "@ui";
import { FunctionComponent } from "react";
import { DirectSpikeTrainsClient } from "../DirectSpikeTrainsClient";
import "./PSTHControls.css";

type UnitsSelectionProps = {
  unitIds?: (number | string)[];
  selectedUnitIds: (number | string)[];
  setSelectedUnitIds: (x: (number | string)[]) => void;
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  sortUnitsByValues: { [unitId: string | number]: number | string } | undefined;
  spikeTrainsClient: DirectSpikeTrainsClient | undefined;
};

/** Units to plot, with their spike counts; the first box picks all or none. */
const UnitSelectionComponent: FunctionComponent<UnitsSelectionProps> = ({
  unitIds,
  selectedUnitIds,
  setSelectedUnitIds,
  sortUnitsByVariable,
  sortUnitsByValues,
  spikeTrainsClient,
}) => {
  if (!unitIds)
    return <LoadingState label="Reading the units" phase="loading" />;
  const n = selectedUnitIds.length;
  const sortedBy = sortUnitsByVariable?.[0];
  return (
    <div className="psth-checklist">
      <Checkbox
        label="All units"
        checked={n === 0 ? false : n === unitIds.length ? true : "mixed"}
        onChange={() => setSelectedUnitIds(n > 0 ? [] : unitIds)}
        count="Spikes"
      />
      {unitIds.map((unitId) => {
        const spikes = spikeTrainsClient?.numSpikesForUnit(unitId);
        const sortValue =
          sortedBy && sortUnitsByValues
            ? ` · ${sortedBy} ${sortUnitsByValues[unitId]}`
            : "";
        return (
          <Checkbox
            key={unitId}
            label={`Unit ${unitId}${sortValue}`}
            checked={selectedUnitIds.includes(unitId)}
            count={
              spikes !== undefined ? spikes.toLocaleString("en-US") : undefined
            }
            onChange={(on) =>
              setSelectedUnitIds(
                on
                  ? [...selectedUnitIds, unitId]
                  : selectedUnitIds.filter((x) => x !== unitId),
              )
            }
          />
        );
      })}
    </div>
  );
};

export default UnitSelectionComponent;
