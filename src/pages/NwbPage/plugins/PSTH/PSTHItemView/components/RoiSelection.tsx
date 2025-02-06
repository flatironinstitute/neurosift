import { FunctionComponent } from "react";
import { RoiClient } from "../ROIClient";

type RoiSelectionProps = {
  roiClient: RoiClient | null;
  selectedRoiIndices: number[];
  setSelectedRoiIndices: (x: number[]) => void;
};

const RoiSelectionComponent: FunctionComponent<RoiSelectionProps> = ({
  roiClient,
  selectedRoiIndices,
  setSelectedRoiIndices,
}) => {
  const roiIndices = roiClient ? roiClient.getRoiIndices() : [];

  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th>
            <input
              type="checkbox"
              checked={
                roiIndices.length > 0 &&
                selectedRoiIndices.length === roiIndices.length
              }
              onChange={() => {}}
              onClick={() => {
                if (selectedRoiIndices.length > 0) {
                  setSelectedRoiIndices([]);
                } else {
                  setSelectedRoiIndices(roiIndices);
                }
              }}
            />
          </th>
          <th>ROI Index</th>
        </tr>
      </thead>
      <tbody>
        {roiIndices.map((roiIndex) => (
          <tr key={roiIndex}>
            <td>
              <input
                type="checkbox"
                checked={selectedRoiIndices.includes(roiIndex)}
                onChange={() => {}}
                onClick={() => {
                  if (selectedRoiIndices.includes(roiIndex)) {
                    setSelectedRoiIndices(
                      selectedRoiIndices.filter((x) => x !== roiIndex),
                    );
                  } else {
                    setSelectedRoiIndices([...selectedRoiIndices, roiIndex]);
                  }
                }}
              />
            </td>
            <td>{roiIndex}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default RoiSelectionComponent;
