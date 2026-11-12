import { FunctionComponent } from "react";
import { useCategoricalOptions } from "../hooks/useGroupByCategories";

type GroupBySelectionProps = {
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  nwbUrl: string;
  path: string;
  label?: string;
};

const GroupBySelectionComponent: FunctionComponent<GroupBySelectionProps> = ({
  groupByVariable,
  setGroupByVariable,
  nwbUrl,
  path,
  label = "Group trials by:",
}) => {
  const categoricalOptions = useCategoricalOptions(nwbUrl, path);

  return (
    <>
      {label}&nbsp;
      <select
        value={groupByVariable}
        onChange={(evt) => {
          setGroupByVariable(evt.target.value);
        }}
        style={{ maxWidth: 150 }}
      >
        <option value="">(none)</option>
        {(categoricalOptions || []).map((option) => (
          <option key={option.variableName} value={option.variableName}>
            {option.variableName}
          </option>
        ))}
      </select>
    </>
  );
};

export default GroupBySelectionComponent;
