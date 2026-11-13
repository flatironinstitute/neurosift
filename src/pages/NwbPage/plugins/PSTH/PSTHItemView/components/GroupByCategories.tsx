import { Checkbox } from "@ui";
import { FunctionComponent } from "react";
import "./PSTHControls.css";

type Props = {
  groupByVariableCategories: string[] | undefined;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  options: string[];
};

/** Which values of the grouping column to show; undefined means all. */
const GroupByCategoriesComponent: FunctionComponent<Props> = ({
  groupByVariableCategories: picked,
  setGroupByVariableCategories: setPicked,
  options,
}) => {
  const shown = picked ?? options;
  return (
    <div className="psth-checklist">
      <Checkbox
        label="All values"
        checked={
          shown.length === 0
            ? false
            : shown.length === options.length
              ? true
              : "mixed"
        }
        onChange={() =>
          setPicked(shown.length === options.length ? [] : undefined)
        }
      />
      {options.map((option) => (
        <Checkbox
          key={option}
          label={option}
          checked={shown.includes(option)}
          onChange={(on) => {
            const next = on
              ? [...shown, option]
              : shown.filter((x) => x !== option);
            setPicked(next.length === options.length ? undefined : next);
          }}
        />
      ))}
    </div>
  );
};

export default GroupByCategoriesComponent;
