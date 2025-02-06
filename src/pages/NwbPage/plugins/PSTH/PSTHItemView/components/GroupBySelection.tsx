import { FunctionComponent, useMemo, useEffect, useState } from "react";
import { useNwbGroup, getNwbDatasetData } from "../../../../nwbInterface";

type GroupBySelectionProps = {
  groupByVariable: string;
  setGroupByVariable: (x: string) => void;
  nwbUrl: string;
  path: string;
  groupByVariableCategories?: string[];
  setGroupByVariableCategories?: (x: string[] | undefined) => void;
};

type CategoricalOption = {
  variableName: string;
  categories: string[];
};

const GroupBySelectionComponent: FunctionComponent<GroupBySelectionProps> = ({
  groupByVariable,
  setGroupByVariable,
  nwbUrl,
  path,
  groupByVariableCategories,
  setGroupByVariableCategories,
}) => {
  const group = useNwbGroup(nwbUrl, path);
  const options = useMemo(
    () =>
      (group?.datasets || [])
        .map((ds) => ds.name)
        .filter((name) => !name.endsWith("_time") && !name.endsWith("_times")),
    [group],
  );

  // determine which columns are categorical -- but don't let this slow down the UI
  // while it is calculating, we can use the full list of options
  const [categoricalOptions, setCategoricalOptions] = useState<
    CategoricalOption[] | undefined
  >(undefined);

  useEffect(() => {
    if (!group) return;
    let canceled = false;
    const load = async () => {
      const categoricalOptions: CategoricalOption[] = [];
      for (const option of options) {
        const ds = group.datasets.find((ds) => ds.name === option);
        if (!ds) continue;
        if (ds.shape.length !== 1) continue;
        const slice =
          ds.shape[0] < 1000 ? undefined : ([[0, 1000]] as [number, number][]); // just check the first 1000 values
        const dd = await getNwbDatasetData(nwbUrl, path + "/" + option, {
          slice,
        });
        if (!dd) throw Error(`Unable to get data for ${path}/${option}`);
        if (canceled) return;
        const stringValues = [...dd].map((x) => x.toString());
        const uniqueValues: string[] = [...new Set(stringValues)];
        if (uniqueValues.length <= dd.length / 2) {
          categoricalOptions.push({
            variableName: option,
            categories: uniqueValues,
          });
        }
      }
      if (canceled) return;
      setCategoricalOptions(categoricalOptions);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [options, group, nwbUrl, path]);

  const categoriesForSelectedVariable = useMemo(() => {
    if (!groupByVariable) return undefined;
    const opt = categoricalOptions?.find(
      (opt) => opt.variableName === groupByVariable,
    );
    return opt ? opt.categories : undefined;
  }, [groupByVariable, categoricalOptions]);

  return (
    <>
      Group trials by:&nbsp;
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
      &nbsp;
      {categoriesForSelectedVariable && setGroupByVariableCategories && (
        <GroupByVariableCategoriesComponent
          groupByVariableCategories={groupByVariableCategories}
          setGroupByVariableCategories={setGroupByVariableCategories}
          options={categoriesForSelectedVariable}
        />
      )}
    </>
  );
};

type GroupByVariableCategoriesProps = {
  groupByVariableCategories: string[] | undefined;
  setGroupByVariableCategories: (x: string[] | undefined) => void;
  options: string[];
};

const GroupByVariableCategoriesComponent: FunctionComponent<
  GroupByVariableCategoriesProps
> = ({ groupByVariableCategories, setGroupByVariableCategories, options }) => {
  return (
    <>
      {options.map((option) => (
        <span key={option}>
          <input
            type="checkbox"
            checked={
              groupByVariableCategories?.includes(option) ||
              !groupByVariableCategories
            }
            onChange={() => {}}
            onClick={() => {
              if (groupByVariableCategories) {
                if (groupByVariableCategories.includes(option)) {
                  setGroupByVariableCategories(
                    groupByVariableCategories.filter((x) => x !== option),
                  );
                } else {
                  setGroupByVariableCategories([
                    ...(groupByVariableCategories || []),
                    option,
                  ]);
                }
              } else {
                setGroupByVariableCategories(
                  options.filter((x) => x !== option),
                );
              }
            }}
          />
          {option}
        </span>
      ))}
    </>
  );
};

export default GroupBySelectionComponent;
