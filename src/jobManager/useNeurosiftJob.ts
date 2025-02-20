import { useState, useCallback, useEffect } from "react";

const NSJM_API_BASE_URL = "http://localhost:3000/api";
// const NSJM_API_BASE_URL = "https://neurosift-job-manager.vercel.app/api";

export interface Job {
  _id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  output?: string;
  error?: string;
}

export const useNeurosiftJob = <InputType, ResultType>(
  jobType: string,
  input: InputType,
) => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check for existing job on component mount
  useEffect(() => {
    const findExistingJob = async () => {
      try {
        const response = await fetch(`${NSJM_API_BASE_URL}/jobs/search`, {
          method: "POST",
          headers: {
            ...(localStorage.getItem("neurosiftApiKey")
              ? {
                  Authorization: `Bearer ${localStorage.getItem("neurosiftApiKey")}`,
                }
              : {}),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: jobType,
            input,
          }),
        });

        if (response.ok) {
          const jobs = await response.json();
          if (jobs.length > 0) {
            const mostRecentJob = jobs[0]; // API returns sorted by createdAt desc
            setJobId(mostRecentJob._id);
            setJob(mostRecentJob);
            if (mostRecentJob.status === "completed" && mostRecentJob.output) {
              const outputObject = JSON.parse(mostRecentJob.output);
              setResult(outputObject);
            }
          }
        }
      } catch (error) {
        console.error("Error finding existing job:", error);
        // Don't set error state here - let user start new job if needed
      }
    };

    findExistingJob();
  }, [jobType, input]);

  const submitJob = useCallback(async () => {
    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          ...(localStorage.getItem("neurosiftApiKey")
            ? {
                Authorization: `Bearer ${localStorage.getItem("neurosiftApiKey")}`,
              }
            : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: jobType,
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
  }, [jobType, input]);

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;
    setIsRefreshing(true);

    try {
      const response = await fetch(`${NSJM_API_BASE_URL}/jobs/${jobId}`, {
        headers: {
          ...(localStorage.getItem("neurosiftApiKey")
            ? {
                Authorization: `Bearer ${localStorage.getItem("neurosiftApiKey")}`,
              }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Error fetching job status: ${response.statusText}`);
      }

      const job = await response.json();
      setJob(job);

      if (job.status === "completed" && job.output) {
        const outputObject = JSON.parse(job.output);
        setResult(outputObject);
      } else if (job.status === "failed") {
        setError(job.error || "Job failed");
      }
    } catch (error: unknown) {
      setError(
        `Failed to fetch job status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchJobStatus();
  }, [fetchJobStatus]);

  return {
    job,
    result,
    error,
    isRefreshing,
    submitJob,
    fetchJobStatus,
  };
};
