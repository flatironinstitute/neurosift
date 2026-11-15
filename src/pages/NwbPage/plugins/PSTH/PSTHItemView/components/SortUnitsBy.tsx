import { useHdf5Group } from "@hdf5Interface";
import { SegmentedControl, Select } from "@ui";
import { FunctionComponent, useMemo } from "react";

type SortUnitsBySelectionProps = {
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  setSortUnitsByVariable: (x: [string, "asc" | "desc"] | undefined) => void;
  nwbUrl: string;
  unitsPath: string;
};

/** A column of the units table to sort by, then the direction. */
const SortUnitsBySelectionComponent: FunctionComponent<
  SortUnitsBySelectionProps
> = ({ sortUnitsByVariable, setSortUnitsByVariable, nwbUrl, unitsPath }) => {
  const group = useHdf5Group(nwbUrl, unitsPath);
  const variableNames: string[] = useMemo(
    () =>
      (group?.attrs?.colnames ?? []).filter(
        (name: string) =>
          !["spike_times", "spike_times_index", "id"].includes(name),
      ),
    [group],
  );
  const [column, direction] = sortUnitsByVariable ?? ["", "asc"];
  return (
    <>
      <Select
        label="Sort units by"
        size="sm"
        value={column}
        onChange={(c) => setSortUnitsByVariable(c ? [c, direction] : undefined)}
        options={[
          { value: "", label: "None" },
          ...variableNames.map((v) => ({ value: v, label: v })),
        ]}
      />
      {column && (
        <SegmentedControl
          label="Order"
          size="sm"
          value={direction}
          onChange={(d) =>
            setSortUnitsByVariable([column, d as "asc" | "desc"])
          }
          options={[
            { value: "asc", label: "Ascending" },
            { value: "desc", label: "Descending" },
          ]}
        />
      )}
    </>
  );
};

export default SortUnitsBySelectionComponent;
