import { FunctionComponent } from "react";
import { useHdf5Group } from "@hdf5Interface";

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
  const group = useHdf5Group(nwbUrl, path);
  const options = (group?.datasets || [])
    .map((ds) => ds.name)
    .filter((name) => name.endsWith("_time") || name.endsWith("_times"));

  return (
    <table className="nwb-table" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: 20 }} />
      </colgroup>
      <tbody>
        {options.map((option) => (
          <tr key={option}>
            <td style={{ padding: "4px 2px" }}>
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
