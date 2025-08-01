import { RemoteH5FileLindi } from "@remote-h5-file";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import React, { useEffect, useState } from "react";
import NeurotileEcephysClient from "./NeurotileEcephysClient";
import NeurotileView from "./NeurotileView";

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
    const params = new URLSearchParams(window.location.search);
    const example = params.get("example") || "1"; // Default to example 1

    const load1 = async () => {
      const url =
        "https://tiles.neurosift.org/dandisets/000957/d4bd92fc-4119-4393-b807-f007a86778a1/tiles.zarr";
      const x = await RemoteH5FileLindi.createFromZarr(url);
      const statusDataUrl = url + ".status.json";
      const c = await NeurotileEcephysClient.create(
        x,
        "/acquisition/ElectricalSeriesAP",
        statusDataUrl,
      );
      setClient(c);
    };
    const load2 = async () => {
      const url =
        "https://tiles.neurosift.org/dandisets/000409/c04f6b30-82bf-40e1-9210-34f0bcd8be24/tiles.zarr";
      const x = await RemoteH5FileLindi.createFromZarr(url);
      const statusDataUrl = url + ".status.json";
      const c = await NeurotileEcephysClient.create(
        x,
        "/acquisition/ElectricalSeriesAp",
        statusDataUrl,
      );
      setClient(c);
    };

    // Choose which example to load based on URL parameter
    if (example === "2") {
      load2();
    } else {
      load1();
    }
  }, []);

  return client;
};

export default ExperimentalNeurotilePage;
