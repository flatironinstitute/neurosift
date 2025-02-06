import { FunctionComponent, useMemo } from "react";
import { useNwbGroup } from "../../../../nwbInterface";

type SortUnitsBySelectionProps = {
  sortUnitsByVariable: [string, "asc" | "desc"] | undefined;
  setSortUnitsByVariable: (x: [string, "asc" | "desc"] | undefined) => void;
  nwbUrl: string;
  unitsPath: string;
};

const SortUnitsBySelectionComponent: FunctionComponent<
  SortUnitsBySelectionProps
> = ({ sortUnitsByVariable, setSortUnitsByVariable, nwbUrl, unitsPath }) => {
  const group = useNwbGroup(nwbUrl, unitsPath);
  const colnames = useMemo(() => group?.attrs?.colnames || undefined, [group]);
  const variableNames: string[] | undefined = useMemo(
    () =>
      colnames
        ? colnames.filter(
            (name: string) =>
              !["spike_times", "spike_times_index", "id"].includes(name),
          )
        : [],
    [colnames],
  );

  return (
    <>
      Sort units by:&nbsp;
      <select
        value={sortUnitsByVariable ? sortUnitsByVariable[0] : ""}
        onChange={(evt) => {
          setSortUnitsByVariable([
            evt.target.value,
            sortUnitsByVariable ? sortUnitsByVariable[1] : "asc",
          ]);
        }}
        style={{ maxWidth: 150 }}
      >
        <option value="">(none)</option>
        {variableNames?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      &nbsp;
      <select
        value={sortUnitsByVariable ? sortUnitsByVariable[1] : "asc"}
        onChange={(evt) => {
          setSortUnitsByVariable([
            sortUnitsByVariable ? sortUnitsByVariable[0] : "",
            evt.target.value as "asc" | "desc",
          ]);
        }}
      >
        <option value="asc">Ascending</option>
        <option value="desc">Descending</option>
      </select>
    </>
  );
};

export default SortUnitsBySelectionComponent;
