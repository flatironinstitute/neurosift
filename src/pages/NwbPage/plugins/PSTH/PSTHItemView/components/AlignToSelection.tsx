import { FunctionComponent } from "react";
import { useNwbGroup } from "../../../../nwbInterface";

type AlignToSelectionProps = {
  alignToVariables: string[];
  setAlignToVariables: (x: string[]) => void;
  nwbUrl: string;
  path: string;
};

const AlignToSelectionComponent: FunctionComponent<AlignToSelectionProps> = ({
  alignToVariables,
  setAlignToVariables,
  nwbUrl,
  path,
}) => {
  const group = useNwbGroup(nwbUrl, path);
  const options = (group?.datasets || [])
    .map((ds) => ds.name)
    .filter((name) => name.endsWith("_time") || name.endsWith("_times"));

  return (
    <table className="nwb-table">
      <thead>
        <tr>
          <th></th>
          <th>Align to</th>
        </tr>
      </thead>
      <tbody>
        {options.map((option) => (
          <tr key={option}>
            <td>
              <input
                type="checkbox"
                checked={alignToVariables.includes(option)}
                onChange={() => {}}
                onClick={() => {
                  if (alignToVariables.includes(option)) {
                    setAlignToVariables(
                      alignToVariables.filter((x) => x !== option),
                    );
                  } else {
                    setAlignToVariables([...alignToVariables, option]);
                  }
                }}
              />
            </td>
            <td>{option}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AlignToSelectionComponent;
