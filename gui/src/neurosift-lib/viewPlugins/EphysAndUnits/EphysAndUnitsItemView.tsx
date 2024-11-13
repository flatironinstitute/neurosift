import { FunctionComponent, useMemo } from "react";
import NeurodataTimeSeriesItemView from "../TimeSeries/NeurodataTimeSeriesItemView";
import UnitsItemView from "../Units/UnitsItemView";
import Splitter from "../../components/Splitter";
import { useDirectSpikeTrainsClientUnitSlice } from "../Units/DirectRasterPlotUnitsItemView";
import { useSelectedUnitIds } from "../../contexts/context-unit-selection";
import { useNwbFile } from "../../misc/NwbFileContext";

type EphysAndUnitsItemViewProps = {
  width: number;
  height: number;
  path: string;
  additionalPaths?: string[];
  condensed?: boolean;
};

const EphysAndUnitsItemView: FunctionComponent<EphysAndUnitsItemViewProps> = ({
  width,
  height,
  path,
  additionalPaths,
  condensed,
}) => {
  const electricalSeriesItemPath = path;
  const unitsItemPath = additionalPaths ? additionalPaths[0] : undefined;
  if (!unitsItemPath) throw Error("Unexpected: no units item path");

  const nwbFile = useNwbFile();
  if (!nwbFile) throw Error("Unexpected: nwbFile is null");

  const { selectedUnitIds } = useSelectedUnitIds();
  const selectedUnitIdsList = useMemo(() => {
    return [...selectedUnitIds];
  }, [selectedUnitIds]);
  const spikeTrainsClient = useDirectSpikeTrainsClientUnitSlice(
    nwbFile,
    unitsItemPath,
    selectedUnitIdsList,
  );

  return (
    <Splitter
      direction="vertical"
      initialPosition={(height * 2) / 3}
      width={width}
      height={height}
    >
      <NeurodataTimeSeriesItemView
        width={0}
        height={0}
        path={electricalSeriesItemPath}
        condensed={false}
        spikeTrainsClient={spikeTrainsClient}
      />
      <UnitsItemView
        width={0}
        height={0}
        path={unitsItemPath}
        condensed={false}
      />
    </Splitter>
  );
};

export default EphysAndUnitsItemView;
