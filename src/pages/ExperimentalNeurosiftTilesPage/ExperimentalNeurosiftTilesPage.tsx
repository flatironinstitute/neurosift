import { RemoteH5FileLindi } from "@remote-h5-file";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import React, { useEffect, useState } from "react";
import NTEcephysClient from "./NTEcephysClient";
import NTView from "./NTView";

type ExperimentalNTPageProps = {
  width: number;
  height: number;
};

const ExperimentalNTPage: React.FC<ExperimentalNTPageProps> = ({
  width,
  height,
}) => {
  const { client, showExamples } = useTest();

  if (showExamples) {
    return <ExamplesPage width={width} height={height} />;
  }

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
        <div>Loading neurosift-tiles client...</div>
      </div>
    );
  }

  return (
    <ProvideTimeseriesSelection>
      <NTView client={client} width={width} height={height} />
    </ProvideTimeseriesSelection>
  );
};

const ExamplesPage: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  const example1Url =
    "zarr_url=https://tiles.neurosift.org/dandisets/000957/d4bd92fc-4119-4393-b807-f007a86778a1/tiles.zarr&path=/acquisition/ElectricalSeriesAP";

  const example2Url =
    "zarr_url=https://tiles.neurosift.org/dandisets/000409/c04f6b30-82bf-40e1-9210-34f0bcd8be24/tiles.zarr&path=/acquisition/ElectricalSeriesAp";

  const handleExample1Click = () => {
    window.location.href = `?${example1Url}`;
  };

  const handleExample2Click = () => {
    window.location.href = `?${example2Url}`;
  };

  return (
    <div
      style={{
        width,
        height,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <h2>Experimental Neurosift Tiles Examples</h2>
      <p>Choose an example to explore:</p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h3>Example 1: DANDI 000957</h3>
          <p>ElectricalSeriesAP from dandiset 000957</p>
          <button
            onClick={handleExample1Click}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              textDecoration: "none",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Load Example 1
          </button>
        </div>
        <div style={{ textAlign: "center" }}>
          <h3>Example 2: DANDI 000409</h3>
          <p>ElectricalSeriesAp from dandiset 000409</p>
          <button
            onClick={handleExample2Click}
            style={{
              display: "inline-block",
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              textDecoration: "none",
              borderRadius: "5px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Load Example 2
          </button>
        </div>
      </div>
    </div>
  );
};

const useTest = () => {
  const [client, setClient] = useState<NTEcephysClient | null>(null);
  const [showExamples, setShowExamples] = useState<boolean>(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const zarrUrl = params.get("zarr_url");
    const path = params.get("path");

    // If both parameters are provided, load the data
    if (zarrUrl && path) {
      const loadData = async () => {
        try {
          const x = await RemoteH5FileLindi.createFromZarr(zarrUrl);
          const statusDataUrl = zarrUrl + ".status.json";
          const c = await NTEcephysClient.create(x, path, statusDataUrl);
          setClient(c);
        } catch (error) {
          console.error("Error loading data:", error);
          // If there's an error, show examples page
          setShowExamples(true);
        }
      };
      loadData();
    } else {
      // If parameters are missing, show examples page
      setShowExamples(true);
    }
  }, []);

  return { client, showExamples };
};

export default ExperimentalNTPage;
