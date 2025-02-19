import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useInterval } from "react-use";

// Hard-coded for now - would come from environment in production
// const NSJM_API_BASE_URL = 'http://localhost:3000/api'
const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

// For now this is hard-coded in the UI -- try to figure out how to make this more secure
const NSJM_API_SUBMIT_KEY = "d38b9460ae73a5e4690dd03b13c4a1dc";

import { DatasetPluginProps } from "../pluginInterface";

interface LetterCounts {
  [key: string]: number;
}

interface JobResult {
  letterCounts: LetterCounts;
  totalLetters: number;
}

interface Job {
  _id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  output?: string;
  error?: string;
}

const TextLetterCountView: FunctionComponent<DatasetPluginProps> = ({
  file,
}) => {
  const fileUrl = file.urls[0];
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [result, setResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const input = useMemo(() => ({ fileUrl, version: 2 }), [fileUrl]);

  // Check for existing job on component mount
  useEffect(() => {
    const findExistingJob = async () => {
      try {
        const response = await fetch(`${NSJM_API_BASE_URL}/jobs/search`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NSJM_API_SUBMIT_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "text-letter-count",
            input,
          }),
        });

        if (response.ok) {
          const jobs = await response.json();
          // Get most recent job if any exist
          if (jobs.length > 0) {
            const mostRecentJob = jobs[0]; // API returns sorted by createdAt desc
            setJobId(mostRecentJob._id);
            setJob(mostRecentJob);
            if (mostRecentJob.status === "completed" && mostRecentJob.output) {
              const outputObject = JSON.parse(mostRecentJob.output);
              const outputUrl = outputObject.outputUrl;
              const resultResponse = await fetch(outputUrl);
              const resultData = await resultResponse.json();
              setResult(resultData);
            }
          }
        }
      } catch (error) {
        console.error("Error finding existing job:", error);
        // Don't set error state here - just let user start a new job if needed
      }
    };

    findExistingJob();
  }, [input]);

  const submitJob = useCallback(async () => {
    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NSJM_API_SUBMIT_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "text-letter-count",
          input,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error submitting job: ${response.statusText}`);
      }

      const data = await response.json();
      setJobId(data.jobId);
    } catch (error: unknown) {
      setError(
        `Failed to submit job: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [input]);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${NSJM_API_SUBMIT_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching job status: ${response.statusText}`);
      }

      const job = await response.json();
      setJob(job);

      if (job.status === "completed" && job.output) {
        const outputObject = JSON.parse(job.output);
        const outputUrl = outputObject.outputUrl;
        const response = await fetch(outputUrl);
        const resultData = await response.json();
        setResult(resultData);
      } else if (job.status === "failed") {
        setError(job.error || "Job failed");
      }
    } catch (error: unknown) {
      setError(
        `Failed to fetch job status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  useInterval(
    fetchJobStatus,
    job?.status === "pending" || job?.status === "running" ? 5000 : null,
  );

  if (error) {
    return <div style={{ color: "red" }}>Error: {error}</div>;
  }

  if (!jobId) {
    return (
      <div>
        <button onClick={submitJob}>Analyze Letter Frequencies</button>
      </div>
    );
  }

  if (!job || job.status === "pending" || job.status === "running") {
    return (
      <div>
        {job?.status === "pending" ? (
          <div
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              backgroundColor: "#f5f5f5",
            }}
          >
            <div>
              <p>To process this job using Docker:</p>
              <code
                style={{
                  display: "block",
                  padding: "10px",
                  backgroundColor: "#fff",
                  overflowX: "auto",
                  marginBottom: "15px",
                }}
              >
                docker run ghcr.io/flatironinstitute/neurosift-job-runner{" "}
                {jobId}
              </code>

              <p>Or for local development:</p>
              <code
                style={{
                  display: "block",
                  padding: "10px",
                  backgroundColor: "#fff",
                  overflowX: "auto",
                }}
              >
                cd job-manager && pip install -r requirements.txt && python3
                run-job.py {jobId}
              </code>
            </div>
          </div>
        ) : (
          <>
            <p>Processing... {job?.progress || 0}%</p>
            <div
              style={{
                width: "200px",
                height: "20px",
                border: "1px solid #ccc",
              }}
            >
              <div
                style={{
                  width: `${job?.progress || 0}%`,
                  height: "100%",
                  backgroundColor: "#4CAF50",
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  }

  if (!result) {
    return <div>No results available</div>;
  }

  return (
    <div>
      <h3>Letter Frequency Analysis</h3>
      <p>Total letters: {result.totalLetters}</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: "10px",
        }}
      >
        {Object.entries(result.letterCounts).map(([letter, count]) => (
          <div
            key={letter}
            style={{
              padding: "10px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px" }}>{letter}</div>
            <div>{count}</div>
            <div>({((count / result.totalLetters) * 100).toFixed(1)}%)</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { TextLetterCountView };
