import { useHdf5Group } from "@hdf5Interface";
import { Checkbox } from "@ui";
import { FunctionComponent } from "react";
import "./PSTHControls.css";

type AlignToSelectionProps = {
  alignToVariables: string[];
  setAlignToVariables: (x: string[]) => void;
  nwbUrl: string;
  path: string;
};

/** The table's time columns to align to; each picked one gets its own chart. */
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
    <div className="psth-checklist">
      {options.map((option) => (
        <Checkbox
          key={option}
          label={option}
          checked={alignToVariables.includes(option)}
          onChange={(on) =>
            setAlignToVariables(
              on
                ? [...alignToVariables, option]
                : alignToVariables.filter((x) => x !== option),
            )
          }
        />
      ))}
    </div>
  );
};

export default AlignToSelectionComponent;
