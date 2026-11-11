import { Checkbox } from "@ui";
import { FunctionComponent } from "react";
import { RoiClient } from "../ROIClient";
import "./PSTHControls.css";

type RoiSelectionProps = {
  roiClient: RoiClient | null;
  selectedRoiIndices: number[];
  setSelectedRoiIndices: (x: number[]) => void;
};

/** ROIs to plot; the first box picks all or none. */
const RoiSelectionComponent: FunctionComponent<RoiSelectionProps> = ({
  roiClient,
  selectedRoiIndices,
  setSelectedRoiIndices,
}) => {
  const roiIndices = roiClient ? roiClient.getRoiIndices() : [];
  const n = selectedRoiIndices.length;
  return (
    <div className="psth-checklist">
      <Checkbox
        label="All ROIs"
        checked={n === 0 ? false : n === roiIndices.length ? true : "mixed"}
        onChange={() => setSelectedRoiIndices(n > 0 ? [] : roiIndices)}
      />
      {roiIndices.map((i) => (
        <Checkbox
          key={i}
          label={`ROI ${i}`}
          checked={selectedRoiIndices.includes(i)}
          onChange={(on) =>
            setSelectedRoiIndices(
              on
                ? [...selectedRoiIndices, i]
                : selectedRoiIndices.filter((x) => x !== i),
            )
          }
        />
      ))}
    </div>
  );
};

export default RoiSelectionComponent;
