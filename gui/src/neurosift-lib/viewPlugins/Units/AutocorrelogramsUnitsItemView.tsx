/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import {
  AutocorrelogramsView,
  AutocorrelogramsViewData,
} from "./view-autocorrelograms";
import { AutocorrelogramData } from "./view-autocorrelograms/AutocorrelogramsViewData";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const AutocorrelogramsUnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<AutocorrelogramsViewData | undefined | null>(
    undefined,
  );

  useEffect(() => {
    const loadData = async () => {
      const group = await nwbFile.getGroup(path);
      if (!group) {
        setErrorMessage("Group not found");
        setData(null);
        return;
      }
      const unitIdDs = await nwbFile.getDataset(`${path}/id`);
      if (!unitIdDs) {
        setErrorMessage("id dataset not found");
        setData(null);
        return;
      }
      const unitIds = await nwbFile.getDatasetData(`${path}/id`, {});
      if (!unitIds) {
        setErrorMessage("Unable to load id data");
        setData(null);
        return;
      }
      const autocorrelogramsDsOld = await nwbFile.getDataset(
        `${path}/autocorrelograms`,
      );
      const autocorrelogramsDs =
        (await nwbFile.getDataset(`${path}/acg`)) || autocorrelogramsDsOld;
      if (!autocorrelogramsDs) {
        setErrorMessage("acg dataset not found");
        setData(null);
        return;
      }
      const binEdgesSecOld = autocorrelogramsDs.attrs["bin_edges_sec"];
      const binEdgesDs = await nwbFile.getDataset(`${path}/acg_bin_edges`);
      if (!binEdgesSecOld && !binEdgesDs) {
        setErrorMessage("acg_bin_edges dataset not found");
        setData(null);
        return;
      }
      const shape = [...autocorrelogramsDs.shape];
      if (shape.length !== 2) {
        setErrorMessage(
          `autocorrelogram dataset has unexpected shape: ${JSON.stringify(shape)}`,
        );
        setData(null);
        return;
      }
      let binEdgesSec: number[];
      if (binEdgesDs) {
        binEdgesSec = (await nwbFile.getDatasetData(`${path}/acg_bin_edges`, {
          slice: [[0, 1]],
        })) as any;
      } else {
        binEdgesSec = binEdgesSecOld as any;
      }
      if (!binEdgesSec) {
        setErrorMessage("Unexpected: no binEdgesSec");
        setData(null);
        return;
      }
      const autocorrelogramsDataOld = await nwbFile.getDatasetData(
        `${path}/autocorrelograms`,
        {},
      );
      const autocorrelogramsData =
        (await nwbFile.getDatasetData(`${path}/acg`, {})) ||
        autocorrelogramsDataOld;
      if (!autocorrelogramsData) {
        setErrorMessage("Unable to load acg data");
        setData(null);
        return;
      }
      const numUnits = shape[0];
      const numBins = shape[1];
      if (numBins !== binEdgesSec.length - 1) {
        setErrorMessage(
          `Unexpected number of bins: ${numBins} != ${binEdgesSec.length - 1}`,
        );
        setData(null);
        return;
      }

      const autocorrelograms: AutocorrelogramData[] = [];
      for (let i = 0; i < numUnits; i++) {
        const binCounts0 = autocorrelogramsData.slice(
          i * numBins,
          (i + 1) * numBins,
        );
        // convert from Uint32Array to number[]
        const binCounts = Array.from(binCounts0);
        autocorrelograms.push({
          unitId: unitIds[i],
          binEdgesSec,
          binCounts,
        });
      }

      const data: AutocorrelogramsViewData = {
        type: "Autocorrelograms",
        autocorrelograms,
      };

      setData(data);
    };
    loadData();
  }, [nwbFile, path]);

  if (data === undefined) {
    return <div>Loading autocorrelograms...</div>;
  }

  if (data === null) {
    return <div>Error loading autocorrelograms: {errorMessage}</div>;
  }

  return <AutocorrelogramsView data={data} width={width} height={height} />;
};

export default AutocorrelogramsUnitsItemView;
