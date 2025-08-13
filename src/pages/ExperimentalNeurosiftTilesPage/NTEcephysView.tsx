import { useNeurosiftJobs } from "@jobManager/useNeurosiftJob";
import { ProvideTimeseriesSelection } from "@shared/context-timeseries-selection-2";
import { FunctionComponent, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NTEcephysClient from "./NTEcephysClient";
import NTEcephysRawView from "./NTEcephysRawView";
import SpikeSortingDialog from "./SpikeSortingDialog";

type NTEcephysViewProps = {
  zarrUrl: string;
  ecephysPath: string;
  client: NTEcephysClient;
  width: number;
  height: number;
};

type ViewMode = "menu" | "raw" | "spike-sorting";

// Main menu component
const NTEcephysMenuView: FunctionComponent<{
  zarrUrl: string;
  ecephysPath: string;
  client: NTEcephysClient;
  width: number;
  height: number;
  onViewChange: (view: ViewMode, jobId?: string) => void;
}> = ({ zarrUrl, ecephysPath, client, width, height, onViewChange }) => {
  const [spikeSortDialogOpen, setSpikeSortDialogOpen] = useState(false);

  const totalDuration = client.numCoveredSamples / client.samplingFrequency;

  const { jobs, error, isLoading, deleteJobById } =
    useNeurosiftJobs("mountainsort5");

  return (
    <div
      style={{
        width,
        height,
        padding: 20,
        backgroundColor: "white",
        overflow: "auto",
      }}
    >
      <SpikeSortingDialog
        zarrUrl={zarrUrl}
        ecephysPath={ecephysPath}
        open={spikeSortDialogOpen}
        onClose={() => setSpikeSortDialogOpen(false)}
        defaultStartTime={0}
        defaultEndTime={60}
      />

      {/* Dataset Information */}
      <div style={{ marginBottom: 30 }}>
        <h2 style={{ margin: "0 0 15px 0", fontSize: "1.5em" }}>
          Electrophysiology Dataset
        </h2>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            <tr>
              <td
                style={{
                  padding: "5px 10px",
                  fontWeight: "bold",
                  width: "150px",
                }}
              >
                Channels:
              </td>
              <td style={{ padding: "5px 10px" }}>{client.numChannels}</td>
            </tr>
            <tr>
              <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                Duration:
              </td>
              <td style={{ padding: "5px 10px" }}>
                {totalDuration.toFixed(1)} seconds
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                Sampling Rate:
              </td>
              <td style={{ padding: "5px 10px" }}>
                {client.samplingFrequency} Hz
              </td>
            </tr>
            <tr>
              <td style={{ padding: "5px 10px", fontWeight: "bold" }}>
                Total Samples:
              </td>
              <td style={{ padding: "5px 10px" }}>
                {client.numCoveredSamples.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isLoading ? (
        <div style={{ marginBottom: 20 }}>
          <p>Loading spike sorting jobs...</p>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          <h3>Spike Sorting Jobs</h3>
          {error && <p style={{ color: "red" }}>Error: {error}</p>}
          {jobs.length === 0 ? (
            <p>No spike sorting jobs found.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  border: "1px solid #ddd",
                  fontSize: "14px",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#f5f5f5" }}>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Job ID
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Type
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Start Time
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      End Time
                    </th>
                    <th
                      style={{
                        padding: "8px 12px",
                        border: "1px solid #ddd",
                        textAlign: "left",
                        fontWeight: "bold",
                      }}
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    // Parse job data to extract additional fields
                    const jobData = job as {
                      _id: string;
                      status: string;
                      type?: string;
                      input?: string;
                      createdAt?: string;
                      updatedAt?: string;
                    };
                    const jobType = jobData.type || "Unknown";

                    // Parse input to get start/end times if available
                    let startTime = "N/A";
                    let endTime = "N/A";
                    try {
                      if (jobData.input) {
                        const inputData = JSON.parse(jobData.input);
                        startTime =
                          inputData.startTime !== undefined
                            ? `${inputData.startTime}s`
                            : "N/A";
                        endTime =
                          inputData.endTime !== undefined
                            ? `${inputData.endTime}s`
                            : "N/A";
                      }
                    } catch {
                      // Ignore parsing errors
                    }

                    return (
                      <tr key={job._id}>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            fontFamily: "monospace",
                            fontSize: "12px",
                          }}
                        >
                          <button
                            onClick={() =>
                              onViewChange("spike-sorting", job._id)
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#2196F3",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontFamily: "monospace",
                              fontSize: "12px",
                              padding: 0,
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.color = "#1976D2";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.color = "#2196F3";
                            }}
                          >
                            {job._id.substring(0, 8)}...
                          </button>
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                          }}
                        >
                          {jobType}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                          }}
                        >
                          <span
                            style={{
                              padding: "2px 6px",
                              borderRadius: "3px",
                              fontSize: "12px",
                              fontWeight: "bold",
                              backgroundColor:
                                job.status === "completed"
                                  ? "#d4edda"
                                  : job.status === "failed"
                                    ? "#f8d7da"
                                    : job.status === "running"
                                      ? "#fff3cd"
                                      : "#e2e3e5",
                              color:
                                job.status === "completed"
                                  ? "#155724"
                                  : job.status === "failed"
                                    ? "#721c24"
                                    : job.status === "running"
                                      ? "#856404"
                                      : "#383d41",
                            }}
                          >
                            {job.status}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            fontSize: "12px",
                          }}
                        >
                          {startTime}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                            fontSize: "12px",
                          }}
                        >
                          {endTime}
                        </td>
                        <td
                          style={{
                            padding: "8px 12px",
                            border: "1px solid #ddd",
                          }}
                        >
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Are you sure you want to delete job ${job._id.substring(0, 8)}...?`,
                                )
                              ) {
                                deleteJobById(job._id);
                              }
                            }}
                            style={{
                              padding: "4px 8px",
                              backgroundColor: "#dc3545",
                              color: "white",
                              border: "none",
                              borderRadius: "3px",
                              cursor: "pointer",
                              fontSize: "12px",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "#c82333";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "#dc3545";
                            }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 15, flexWrap: "wrap" }}>
        <button
          onClick={() => onViewChange("raw")}
          style={{
            padding: "12px 24px",
            backgroundColor: "#2196F3",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          View Raw Data
        </button>

        <button
          onClick={() => setSpikeSortDialogOpen(true)}
          style={{
            padding: "12px 24px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
        >
          Run Spike Sorting
        </button>
      </div>
    </div>
  );
};

const NTEcephysView: FunctionComponent<NTEcephysViewProps> = ({
  zarrUrl,
  ecephysPath,
  client,
  width,
  height,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Parse the current view from URL parameters
  const params = new URLSearchParams(location.search);
  const currentView = (params.get("view") as ViewMode) || "menu";
  const spikeSortingJobId = params.get("spike_sorting_job");

  const handleViewChange = (view: ViewMode, jobId?: string) => {
    const newParams = new URLSearchParams(location.search);
    if (view === "menu") {
      newParams.delete("view");
      newParams.delete("job");
    } else {
      newParams.set("view", view);
      if (jobId) {
        newParams.set("job", jobId);
      } else {
        newParams.delete("job");
      }
    }
    let q = `zarr_url=${zarrUrl}&path=${ecephysPath}`;
    q += `&view=${view}`;
    if (view === "spike-sorting" && jobId) {
      q += `&spike_sorting_job=${jobId}`;
    }
    navigate(`${location.pathname}?${q}`);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case "raw":
        return (
          <ProvideTimeseriesSelection>
            <NTEcephysRawView client={client} width={width} height={height} />
          </ProvideTimeseriesSelection>
        );
      case "spike-sorting":
        return (
          <ProvideTimeseriesSelection>
            <NTEcephysRawView
              client={client}
              width={width}
              height={height}
              spikeSortingJobId={spikeSortingJobId || undefined}
            />
          </ProvideTimeseriesSelection>
        );
      case "menu":
      default:
        return (
          <NTEcephysMenuView
            zarrUrl={zarrUrl}
            ecephysPath={ecephysPath}
            client={client}
            width={width}
            height={height}
            onViewChange={handleViewChange}
          />
        );
    }
  };

  return (
    <div style={{ position: "relative", width, height }}>
      {renderCurrentView()}
    </div>
  );
};

export default NTEcephysView;
