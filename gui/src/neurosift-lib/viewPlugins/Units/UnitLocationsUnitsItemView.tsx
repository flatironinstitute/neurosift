/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { useNwbFile } from "../../misc/NwbFileContext";
import ElectrodeGeometryView from "../Ephys/ElectrodeGeometryView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

type UnitLocationsViewData = {
  units: {
    unitId: number | string;
    x: number;
    y: number;
    z: number;
  }[];
};

const UnitLocationsUnitsItemView: FunctionComponent<Props> = ({
  width,
  height,
  path,
  condensed,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<UnitLocationsViewData | undefined | null>(
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
      const xDs = await nwbFile.getDataset(`${path}/x`);
      if (!xDs) {
        setErrorMessage("x dataset not found");
        setData(null);
        return;
      }
      const xData = await nwbFile.getDatasetData(`${path}/x`, {});
      if (!xData) {
        setErrorMessage("Unable to load x data");
        setData(null);
        return;
      }
      const yDs = await nwbFile.getDataset(`${path}/y`);
      if (!yDs) {
        setErrorMessage("y dataset not found");
        setData(null);
        return;
      }
      const yData = await nwbFile.getDatasetData(`${path}/y`, {});
      if (!yData) {
        setErrorMessage("Unable to load y data");
        setData(null);
        return;
      }
      const zDs = await nwbFile.getDataset(`${path}/z`);
      const zData = zDs ? await nwbFile.getDatasetData(`${path}/z`, {}) : null;
      const viewData = {
        units: Array.from(unitIds).map(
          (unitId: number | string, i: number) => ({
            unitId,
            x: xData[i],
            y: yData[i],
            z: zData ? zData[i] : 0,
          }),
        ),
      };
      setData(viewData);
    };
    loadData();
  }, [nwbFile, path]);

  if (data === undefined) {
    return <div>Loading unit locations...</div>;
  }

  if (data === null) {
    return <div>Error loading unit locations: {errorMessage}</div>;
  }

  return <UnitLocationsView data={data} width={width} height={height} />;
};

type UnitLocationsViewProps = {
  data: UnitLocationsViewData;
  width: number;
  height: number;
};

const UnitLocationsView: FunctionComponent<UnitLocationsViewProps> = ({
  data,
  width,
  height,
}) => {
  const nwbFile = useNwbFile();
  const { xMin, xMax, yMin, yMax, zMin, zMax } = useMemo(() => {
    let xMin = Infinity;
    let xMax = -Infinity;
    let yMin = Infinity;
    let yMax = -Infinity;
    let zMin = Infinity;
    let zMax = -Infinity;
    for (const unit of data.units) {
      xMin = Math.min(xMin, unit.x);
      xMax = Math.max(xMax, unit.x);
      yMin = Math.min(yMin, unit.y);
      yMax = Math.max(yMax, unit.y);
      zMin = Math.min(zMin, unit.z);
      zMax = Math.max(zMax, unit.z);
    }
    return { xMin, xMax, yMin, yMax, zMin, zMax };
  }, [data.units]);
  const range = useMemo(() => {
    return {
      xMin,
      xMax,
      yMin,
      yMax,
      zMin,
      zMax,
    };
  }, [xMax, xMin, yMax, yMin, zMax, zMin]);
  return (
    <ElectrodeGeometryView
      width={width}
      height={height}
      nwbFile={nwbFile}
      electricalSeriesPath={undefined}
      range={range}
      units={data.units}
    />
  );
};

export default UnitLocationsUnitsItemView;
