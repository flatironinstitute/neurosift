import { useState, useEffect } from "react";
import { getHdf5DatasetData } from "@hdf5Interface";

export const useSortUnitsByValues = (
  nwbUrl: string,
  unitsPath: string,
  sortUnitsByVariable: string,
): { [unitId: string | number]: number | string } | undefined => {
  const [sortUnitsByValues, setSortUnitsByValues] = useState<
    { [unitId: string | number]: number | string } | undefined
  >(undefined);

  useEffect(() => {
    setSortUnitsByValues(undefined);
    if (!nwbUrl) return;
    if (!unitsPath) return;
    if (!sortUnitsByVariable) return;

    let canceled = false;
    const load = async () => {
      const dsId = await getHdf5DatasetData(nwbUrl, unitsPath + "/id", {});
      if (canceled) return;
      const dsVar = await getHdf5DatasetData(
        nwbUrl,
        unitsPath + "/" + sortUnitsByVariable,
        {},
      );
      if (canceled) return;
      if (!dsId || !dsVar) return;

      const x: { [unitId: string | number]: number | string } = {};
      for (let i = 0; i < dsId.length; i++) {
        x[dsId[i]] = dsVar[i];
      }
      setSortUnitsByValues(x);
    };

    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, unitsPath, sortUnitsByVariable]);

  return sortUnitsByValues;
};

export const useSortedIds = (
  ids: (string | number)[] | undefined,
  sortByValues: { [unitId: string | number]: number | string } | undefined,
  sortDirection: "asc" | "desc" | undefined,
) => {
  return ids
    ? [...ids].sort((a, b) => {
        if (!sortByValues) return 0;
        const aVal = sortByValues[a];
        const bVal = sortByValues[b];
        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      })
    : undefined;
};
