import { Select } from "@ui";
import { FunctionComponent } from "react";
import { useCategoricalOptions } from "../hooks/useGroupByCategories";

type GroupBySelectionProps = {
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  nwbUrl: string;
  path: string;
  label?: string;
};

/** A categorical column of the table to group trials by, or none. */
const GroupBySelectionComponent: FunctionComponent<GroupBySelectionProps> = ({
  groupByVariable,
  setGroupByVariable,
  nwbUrl,
  path,
  label = "Group trials by",
}) => {
  const categoricalOptions = useCategoricalOptions(nwbUrl, path);
  return (
    <Select
      label={label}
      size="sm"
      value={groupByVariable}
      onChange={setGroupByVariable}
      options={[
        { value: "", label: "None" },
        ...(categoricalOptions || []).map((o) => ({
          value: o.variableName,
          label: o.variableName,
        })),
      ]}
    />
  );
};

export default GroupBySelectionComponent;
