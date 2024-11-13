import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  default as ElectrodeGeometryWidget,
  ElectrodeLocation,
} from "./ElectrodeGeometryWidget";
import { RemoteH5FileX } from "../../remote-h5-file/index";

type ElectrodeGeometryViewProps = {
  width: number;
  height: number;
  nwbFile: RemoteH5FileX;
  electricalSeriesPath?: string;
  colors?: string[];
  deadElectrodeIndices?: number[];
  range?: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
  units?: {
    unitId: number | string;
    x: number;
    y: number;
    z: number;
  }[];
  visibleElectrodeIndices?: number[];
};

const ElectrodeGeometryView: FunctionComponent<ElectrodeGeometryViewProps> = ({
  width,
  height,
  nwbFile,
  electricalSeriesPath,
  colors,
  deadElectrodeIndices,
  range,
  units,
  visibleElectrodeIndices,
}) => {
  const [usingZ, setUsingZ] = useState<boolean>(false);
  const [electrodeLocations, setElectrodeLocations] = useState<
    ElectrodeLocation[] | undefined
  >(undefined);
  // const [electrodeRegions, setElectrodeRegions] = useState<string[] | undefined>(undefined)
  useEffect(() => {
    (async () => {
      setElectrodeLocations(undefined);
      let electrodeIndices: number[] | undefined;
      if (electricalSeriesPath) {
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
        electrodeIndices = Array.from(esElectrodeIndices);
      }
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
      const indsInRange: number[] = [];
      if (range) {
        for (let i = 0; i < x.length; i++) {
          let ok = true;
          if (x[i] < range.xMin) ok = false;
          if (x[i] > range.xMax) ok = false;
          if (y[i] < range.yMin) ok = false;
          if (y[i] > range.yMax) ok = false;
          if (z && z[i] < range.zMin) ok = false;
          if (z && z[i] > range.zMax) ok = false;
          if (ok) {
            indsInRange.push(i);
          }
        }
      } else {
        for (let i = 0; i < x.length; i++) {
          indsInRange.push(i);
        }
      }
      // sometimes y is all zeros, so we use z instead
      if (
        z &&
        Array.from(y).every((v) => v === 0) &&
        !Array.from(z).every((v) => v === 0)
      ) {
        console.info("Using z instead of y");
        y = z;
        setUsingZ(true);
      } else {
        setUsingZ(false);
      }
      const locations: ElectrodeLocation[] = [];
      if (electrodeIndices) {
        for (let i = 0; i < electrodeIndices.length; i++) {
          if (visibleElectrodeIndices && !visibleElectrodeIndices.includes(i)) {
            continue;
          }
          if (!indsInRange.includes(electrodeIndices[i])) {
            continue;
          }
          locations.push({
            channelId: electrodeIndices[i],
            x: x[electrodeIndices[i]],
            y: y[electrodeIndices[i]],
          });
        }
      } else {
        for (let i = 0; i < x.length; i++) {
          if (visibleElectrodeIndices && !visibleElectrodeIndices.includes(i)) {
            continue;
          }
          if (!indsInRange.includes(i)) {
            continue;
          }
          locations.push({
            channelId: i,
            x: x[i],
            y: y[i],
          });
        }
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
  }, [nwbFile, electricalSeriesPath, visibleElectrodeIndices, range]);
  const range2 = useMemo(() => {
    if (!range) return undefined;
    if (usingZ) {
      return {
        xMin: range.xMin,
        xMax: range.xMax,
        yMin: range.zMin,
        yMax: range.zMax,
      };
    } else {
      return {
        xMin: range.xMin,
        xMax: range.xMax,
        yMin: range.yMin,
        yMax: range.yMax,
      };
    }
  }, [range, usingZ]);
  const units2 = useMemo(() => {
    if (!units) return undefined;
    if (usingZ) {
      return units.map((u) => ({
        unitId: u.unitId,
        x: u.x,
        y: u.z,
      }));
    } else {
      return units.map((u) => ({
        unitId: u.unitId,
        x: u.x,
        y: u.y,
      }));
    }
  }, [units, usingZ]);
  if (!electrodeLocations) return <div />;
  return (
    <ElectrodeGeometryWidget
      width={width}
      height={height}
      electrodeLocations={electrodeLocations}
      // electrodeRegions={electrodeRegions}
      colors={colors}
      deadElectrodeIndices={deadElectrodeIndices}
      range={range2}
      units={units2}
    />
  );
};

export default ElectrodeGeometryView;
