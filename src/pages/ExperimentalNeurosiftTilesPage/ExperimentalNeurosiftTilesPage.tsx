import { RemoteH5FileLindi } from "@remote-h5-file";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import React, { useEffect, useState } from "react";
import NTEcephysClient from "./NTEcephysClient";
import NTView from "./NTView";

type Dataset = {
  dandiset_id: string;
  asset_id: string;
  nwb_url: string;
  electrical_series_path: string;
};

type EcephysCatalog = {
  datasets: Dataset[];
  metadata: {
    version: string;
  };
};

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
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          "https://raw.githubusercontent.com/magland/neurosift-tiles/refs/heads/main/ecephys_catalog.json"
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch catalog: ${response.statusText}`);
        }
        const catalog: EcephysCatalog = await response.json();
        setDatasets(catalog.datasets);
        setError(null);
      } catch (err) {
        console.error("Error fetching catalog:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

  const handleExampleClick = (dataset: Dataset) => {
    const zarrUrl = `https://tiles.neurosift.org/dandisets/${dataset.dandiset_id}/${dataset.asset_id}/tiles.zarr`;
    const url = `zarr_url=${zarrUrl}&path=${dataset.electrical_series_path}`;
    window.location.href = `?${url}`;
  };

  const handleNeurosiftClick = (dataset: Dataset) => {
    const neurosiftUrl = `https://neurosift.app/nwb?url=${dataset.nwb_url}&dandisetId=${dataset.dandiset_id}`;
    window.open(neurosiftUrl, '_blank');
  };

  const getButtonColor = (index: number) => {
    const colors = ["#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8", "#6f42c1"];
    return colors[index % colors.length];
  };

  if (loading) {
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
        <div>Loading examples...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <div style={{ color: "red", marginBottom: "10px" }}>
          Error loading examples: {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 20px",
            backgroundColor: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflowY: "auto",
      }}
    >
      <h2>Experimental Neurosift Tiles Examples</h2>
      <p>Choose an example to explore:</p>
      <div
        style={{
          marginTop: "20px",
          maxWidth: "800px",
          width: "100%",
        }}
      >
        {datasets.map((dataset, index) => (
          <div 
            key={`${dataset.dandiset_id}-${dataset.asset_id}`} 
            style={{ 
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 15px",
              marginBottom: "8px",
              border: "1px solid #ddd",
              borderRadius: "5px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>DANDI {dataset.dandiset_id}</strong>
              <span style={{ marginLeft: "15px", color: "#666", fontSize: "14px" }}>
                {dataset.electrical_series_path}
              </span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => handleNeurosiftClick(dataset)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                View NWB
              </button>
              <button
                onClick={() => handleExampleClick(dataset)}
                style={{
                  padding: "6px 12px",
                  backgroundColor: getButtonColor(index),
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Load Tiles
              </button>
            </div>
          </div>
        ))}
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
