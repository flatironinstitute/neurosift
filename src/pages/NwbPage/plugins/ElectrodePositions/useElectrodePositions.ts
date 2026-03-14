import { useEffect, useState } from "react";
import { getHdf5DatasetData } from "@hdf5Interface";

export type ElectrodePosition = {
  x: number;
  y: number;
  z: number;
  location?: string;
  index: number;
};

const useElectrodePositions = (nwbUrl: string, path: string) => {
  const [positions, setPositions] = useState<ElectrodePosition[] | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let canceled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [xData, yData, zData, locData] = await Promise.all([
          getHdf5DatasetData(nwbUrl, `${path}/x`, {}),
          getHdf5DatasetData(nwbUrl, `${path}/y`, {}),
          getHdf5DatasetData(nwbUrl, `${path}/z`, {}),
          // Try brain_region first (AnatomicalCoordinatesTable), fall back to location (electrodes table)
          getHdf5DatasetData(nwbUrl, `${path}/brain_region`, {})
            .catch(() => getHdf5DatasetData(nwbUrl, `${path}/location`, {}))
            .catch(() => null),
        ]);
        if (canceled) return;
        if (!xData || !yData || !zData) {
          setError("Missing x, y, or z data");
          return;
        }
        const result: ElectrodePosition[] = [];
        for (let i = 0; i < xData.length; i++) {
          const x = Number(xData[i]);
          const y = Number(yData[i]);
          const z = Number(zData[i]);
          if (isNaN(x) || isNaN(y) || isNaN(z)) continue;
          result.push({
            x,
            y,
            z,
            location: locData ? String(locData[i]) : undefined,
            index: i,
          });
        }
        setPositions(result);
      } catch (err: unknown) {
        if (!canceled) {
          setError(
            err instanceof Error ? err.message : "Failed to load electrode data",
          );
        }
      } finally {
        if (!canceled) setLoading(false);
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [nwbUrl, path]);

  return { positions, loading, error };
};

export default useElectrodePositions;
