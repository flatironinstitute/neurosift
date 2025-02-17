import { useEffect, useState } from "react";
import { getHdf5DatasetData, getHdf5Group } from "@hdf5Interface";
import { DatasetDataType } from "@remote-h5-file/lib/RemoteH5File";

export const useTrialsFilterIndices = (
  trialsFilter: string | undefined,
  nwbUrl: string,
  path: string,
): number[] | undefined | null => {
  const [trialIndices, setTrialIndices] = useState<number[] | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!trialsFilter) {
      return;
    }

    let canceled = false;

    const load = async () => {
      const grp = await getHdf5Group(nwbUrl, path);
      if (!grp) {
        console.warn(`Unable to get group: ${path}`);
        return;
      }
      if (canceled) return;

      const colnames: string[] = grp.attrs?.colnames;
      if (!colnames) {
        console.warn(`No colnames found in group: ${path}`);
        return;
      }

      type DataMap = { [colname: string]: DatasetDataType };
      const data: DataMap = {};

      for (const colname of colnames) {
        if (trialsFilter.includes(colname)) {
          const dsd = await getHdf5DatasetData(
            nwbUrl,
            path + "/" + colname,
            {},
          );
          if (!dsd) {
            console.warn(`Unable to get data for ${path}/${colname}`);
            return;
          }
          if (canceled) return;
          data[colname] = dsd;
        }
      }

      if (Object.keys(data).length === 0) {
        console.warn(`No variables found for trials filter: ${trialsFilter}`);
        return;
      }

      const k = Object.keys(data)[0];
      const n = data[k].length;
      let script = `var inds = [];\n`;
      for (let i = 0; i < n; i++) {
        for (const colname in data) {
          script += `var ${colname} = data['${colname}'][${i}];\n`;
        }
        script += `if (${trialsFilter}) {\n`;
        script += `  inds.push(${i});\n`;
        script += `}\n`;
      }
      script += `inds;\n`;

      try {
        const inds = eval(script);
        if (canceled) return;
        setTrialIndices(inds);
      } catch (err: unknown) {
        console.warn(script);
        console.warn(
          "Error evaluating script for trials filter:",
          err instanceof Error ? err.message : String(err),
        );
      }
    };

    load();
    return () => {
      canceled = true;
    };
  }, [trialsFilter, nwbUrl, path]);

  if (!trialsFilter) return null;
  return trialIndices;
};
