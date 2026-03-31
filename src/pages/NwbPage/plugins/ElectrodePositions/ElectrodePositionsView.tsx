import React, { useMemo } from "react";
import useElectrodePositions from "./useElectrodePositions";
import useAllenCcfData from "./useAllenCcfData";
import BrainMeshScene from "./BrainMeshScene";

type Props = {
  nwbUrl: string;
  path: string;
  width?: number;
  height?: number;
};

const ElectrodePositionsView: React.FC<Props> = ({
  nwbUrl,
  path,
  width = 800,
  height = 500,
}) => {
  const {
    positions,
    loading: positionsLoading,
    error: positionsError,
  } = useElectrodePositions(nwbUrl, path);

  const locations = useMemo(
    () =>
      positions
        ?.map((p) => p.location)
        .filter((l): l is string => l !== undefined),
    [positions],
  );

  const {
    resolvedRegions,
    loaded: ccfLoaded,
    error: ccfError,
  } = useAllenCcfData(locations);

  const loading = positionsLoading || !ccfLoaded;
  const error = positionsError || ccfError;

  if (error) {
    return (
      <div style={{ padding: 16, color: "#c44" }}>
        Error loading electrode positions: {error}
      </div>
    );
  }

  if (loading || !positions) {
    return (
      <div style={{ padding: 16, color: "#888" }}>
        Loading electrode positions...
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div style={{ padding: 16, color: "#888" }}>
        No valid electrode positions found.
      </div>
    );
  }

  const regions = resolvedRegions || [];

  return (
    <div style={{ width }}>
      <BrainMeshScene
        positions={positions}
        regions={regions}
        width={width}
        height={height}
      />
    </div>
  );
};

export default ElectrodePositionsView;
