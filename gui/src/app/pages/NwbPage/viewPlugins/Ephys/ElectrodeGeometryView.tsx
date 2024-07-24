import { FunctionComponent, useEffect, useState } from "react";
import {
  ElectrodeGeometryWidget,
  ElectrodeLocation,
} from "@electrode-geometry/index";
import { RemoteH5FileX } from "@remote-h5-file/index";

type ElectrodeGeometryViewProps = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
  electricalSeriesPath: string;
  colors?: string[];
  deadElectrodeIndices?: number[];
};

const ElectrodeGeometryView: FunctionComponent<ElectrodeGeometryViewProps> = ({
  width,
  height,
  nwbFile,
  electricalSeriesPath,
  colors,
  deadElectrodeIndices,
}) => {
  const [electrodeLocations, setElectrodeLocations] = useState<
    ElectrodeLocation[] | undefined
  >(undefined);
  // const [electrodeRegions, setElectrodeRegions] = useState<string[] | undefined>(undefined)
  useEffect(() => {
    (async () => {
      setElectrodeLocations(undefined);
      const esGrp = await nwbFile.getGroup(electricalSeriesPath);
      if (!esGrp) {
        console.error(`Unable to load group: ${electricalSeriesPath}`);
        return;
      }
      const esElectrodeIndices = await nwbFile.getDatasetData(
        `${electricalSeriesPath}/electrodes`,
        {},
      );
      if (!esElectrodeIndices) {
        console.error(
          `Unable to load dataset: ${electricalSeriesPath}/electrodes`,
        );
        return;
      }
      const electrodeIndices = Array.from(esElectrodeIndices);
      const grp = await nwbFile.getGroup(
        "/general/extracellular_ephys/electrodes",
      );
      if (!grp) {
        console.error(
          "Unable to load group: /general/extracellular_ephys/electrodes",
        );
        return;
      }
      if (!grp.datasets) {
        console.error(
          "No datasets found in group: /general/extracellular_ephys/electrodes",
        );
        return;
      }
      let xDatasetPath = "";
      let yDatasetPath = "";
      let zDatasetPath = "";
      if (grp.datasets.find((ds) => ds.name === "rel_x")) {
        xDatasetPath = "/general/extracellular_ephys/electrodes/rel_x";
        yDatasetPath = "/general/extracellular_ephys/electrodes/rel_y";
        zDatasetPath = "/general/extracellular_ephys/electrodes/rel_z";
      } else if (grp.datasets.find((ds) => ds.name === "x")) {
        xDatasetPath = "/general/extracellular_ephys/electrodes/x";
        yDatasetPath = "/general/extracellular_ephys/electrodes/y";
        zDatasetPath = "/general/extracellular_ephys/electrodes/z";
      } else {
        console.error(
          "No x/y or rel_x/rel_y datasets found in group: /general/extracellular_ephys/electrodes",
        );
        return;
      }
      if (!xDatasetPath || !yDatasetPath) {
        console.error(
          "Unable to find x/y or rel_x/rel_y datasets in group: /general/extracellular_ephys/electrodes",
        );
      }
      const x = await nwbFile.getDatasetData(xDatasetPath, {});
      if (!x) {
        console.error(`Unable to load dataset: ${xDatasetPath}`);
        return;
      }
      let y = await nwbFile.getDatasetData(yDatasetPath, {});
      if (!y) {
        console.error(`Unable to load dataset: ${yDatasetPath}`);
        return;
      }
      const z = await nwbFile.getDatasetData(zDatasetPath, {});
      // sometimes y is all zeros, so we use z instead
      if (
        z &&
        Array.from(y).every((v) => v === 0) &&
        !Array.from(z).every((v) => v === 0)
      ) {
        console.info("Using z instead of y");
        y = z;
      }
      const locations: ElectrodeLocation[] = [];
      for (let i = 0; i < electrodeIndices.length; i++) {
        locations.push({
          x: x[electrodeIndices[i]],
          y: y[electrodeIndices[i]],
        });
      }
      setElectrodeLocations(locations);
      // const xx = await nwbFile.getDatasetData('/general/extracellular_ephys/electrodes/location', {})
      // if (xx) {
      //     setElectrodeRegions(xx as any as string[])
      // }
      // else {
      //     setElectrodeRegions(undefined)
      // }
    })();
  }, [nwbFile, electricalSeriesPath]);
  if (!electrodeLocations) return <div />;
  return (
    <ElectrodeGeometryWidget
      width={width}
      height={height}
      electrodeLocations={electrodeLocations}
      // electrodeRegions={electrodeRegions}
      colors={colors}
      deadElectrodeIndices={deadElectrodeIndices}
    />
  );
};

export default ElectrodeGeometryView;
