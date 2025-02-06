import { useEffect, useState } from "react";
import { DirectSpikeTrainsClient } from "../PSTH/PSTHItemView/DirectSpikeTrainsClient";
import RasterViewPlot from "./RasterViewPlot";

type Props = {
  nwbUrl: string;
  path: string;
};

const RasterView = ({ nwbUrl, path }: Props) => {
  const spikeTrainsClient = useDirectSpikeTrainsClient(nwbUrl, path);
  if (!spikeTrainsClient) return <div>Initializing spike trains client...</div>;
  return <RasterViewChild spikeTrainsClient={spikeTrainsClient} />;
};

type PlotData = {
  unitIds: string[];
  spikeTimes: number[][];
};

const RasterViewChild = ({
  spikeTrainsClient,
}: {
  spikeTrainsClient: DirectSpikeTrainsClient;
}) => {
  const [plotData, setPlotData] = useState<PlotData | null>(null);
  useEffect(() => {
    if (!spikeTrainsClient) return;
    const load = async () => {
      const d: PlotData = {
        unitIds: [],
        spikeTimes: [],
      };
      const unitIdsToView = spikeTrainsClient.unitIds.slice(0, 4);
      const x = await spikeTrainsClient.getData(0, 1, {
        unitIds: unitIdsToView,
      });
      for (const a of x) {
        d.unitIds.push(a.unitId.toString());
        d.spikeTimes.push(a.spikeTimesSec);
      }
      setPlotData(d);
    };
    load();
  }, [spikeTrainsClient]);
  if (!plotData) return <div>Loading spike times...</div>;
  return <RasterViewPlot plotData={plotData} />;
};

const useDirectSpikeTrainsClient = (nwbUrl: string, path: string) => {
  const [spikeTrainsClient, setSpikeTrainsClient] =
    useState<DirectSpikeTrainsClient | null>(null);

  useEffect(() => {
    const create = async () => {
      const client = await DirectSpikeTrainsClient.create(nwbUrl, path);
      setSpikeTrainsClient(client);
    };
    create();
  }, [nwbUrl, path]);

  return spikeTrainsClient;
};

export default RasterView;
