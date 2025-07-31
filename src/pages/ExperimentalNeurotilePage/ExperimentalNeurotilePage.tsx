import { RemoteH5FileLindi } from "@remote-h5-file";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import React, { useEffect, useState } from "react";
import NeurotileEcephysClient from "./NeurotileEcephysClient";
import NeurotileView from "./NeurotileView";

// Multi-dimensional array wrapper classes for handling 1D data in Python (row-major) convention

type ExperimentalNeurotilePageProps = {
  width: number;
  height: number;
};

const ExperimentalNeurotilePage: React.FC<ExperimentalNeurotilePageProps> = ({
  width,
  height,
}) => {
  const client = useTest();

  if (!client) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>Loading neurotile client...</div>
      </div>
    );
  }

  return (
    <ProvideTimeseriesSelection>
      <NeurotileView client={client} width={width} height={height} />
    </ProvideTimeseriesSelection>
  );
};

const useTest = () => {
  const [client, setClient] = useState<NeurotileEcephysClient | null>(null);
  useEffect(() => {
    const load = async () => {
      const url = "http://localhost:3001/000957_example.ns.zarr";
      const x = await RemoteH5FileLindi.createFromZarr(url);
      const c = await NeurotileEcephysClient.create(
        x,
        "/acquisition/ElectricalSeriesAP",
      );
      setClient(c);
    };
    load();
  }, []);

  return client;
};

export default ExperimentalNeurotilePage;
