import { useMemo, useEffect, useState } from "react";
import { useHdf5Group, getHdf5DatasetData } from "@hdf5Interface";

type CategoricalOption = {
  variableName: string;
  categories: string[];
};

export const useCategoricalOptions = (
  nwbUrl: string,
  path: string,
): CategoricalOption[] | undefined => {
  const group = useHdf5Group(nwbUrl, path);
  const options = useMemo(
    () =>
      (group?.datasets || [])
        .map((ds) => ds.name)
        .filter((name) => !name.endsWith("_time") && !name.endsWith("_times")),
    [group],
  );

  const [categoricalOptions, setCategoricalOptions] = useState<
    CategoricalOption[] | undefined
  >(undefined);

  useEffect(() => {
    if (!group) return;
    let canceled = false;
    const load = async () => {
      const result: CategoricalOption[] = [];
      for (const option of options) {
        const ds = group.datasets.find((ds) => ds.name === option);
        if (!ds) continue;
        if (ds.shape.length !== 1) continue;
        const slice =
          ds.shape[0] < 10000
            ? undefined
            : ([[0, 10000]] as [number, number][]);
        const dd = await getHdf5DatasetData(nwbUrl, path + "/" + option, {
          slice,
        });
        if (!dd) throw Error(`Unable to get data for ${path}/${option}`);
        if (canceled) return;
        const stringValues = [...dd].map((x) => x.toString());
        const uniqueValues: string[] = [...new Set(stringValues)];
        if (uniqueValues.length <= dd.length / 2) {
          result.push({
            variableName: option,
            categories: uniqueValues,
          });
        }
      }
      if (canceled) return;
      setCategoricalOptions(result);
    };
    load();
    return () => {
      canceled = true;
    };
  }, [options, group, nwbUrl, path]);

  return categoricalOptions;
};

export const useCategoriesForVariable = (
  nwbUrl: string,
  path: string,
  groupByVariable: string,
): string[] | undefined => {
  const categoricalOptions = useCategoricalOptions(nwbUrl, path);

  return useMemo(() => {
    if (!groupByVariable) return undefined;
    const opt = categoricalOptions?.find(
      (opt) => opt.variableName === groupByVariable,
    );
    return opt ? opt.categories : undefined;
  }, [groupByVariable, categoricalOptions]);
};
