import { useState, useCallback, useEffect, useMemo } from "react";

const RUNPACK_API_BASE_URL = "https://runpack-worker.neurosift.app";
const RUNPACK_API_KEY = "submit8524";

interface RunpackJob {
  job_id: string;
  status:
    | "pending"
    | "claimed"
    | "in_progress"
    | "completed"
    | "failed"
    | "expired";
  message?: string;
  result?: {
    output_data: string;
    console_output: string;
  };
  error?: string;
}

export const useRunpackJob = <InputType, ResultType>(
  jobType: string,
  inputParams: InputType,
) => {
  const [job, setJob] = useState<RunpackJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const result = useMemo<ResultType | null>(() => {
    if (job?.status === "completed" && job.result) {
      try {
        return job.result.output_data as ResultType;
      } catch (e) {
        console.error("Error parsing job output:", e);
        return null;
      }
    }
    return null;
  }, [job]);

  const inputParamsString = JSON.stringify(inputParams);

  // Check for existing job on component mount
  useEffect(() => {
    const checkExistingJob = async () => {
      try {
        const response = await fetch(`${RUNPACK_API_BASE_URL}/api/jobs/check`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RUNPACK_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            job_type: jobType,
            input_params: JSON.parse(inputParamsString),
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            setJob({
              job_id: data.job_id,
              status: data.status,
              message: data.message,
              result: data.result,
            });
          }
        }
      } catch (error) {
        console.error("Error checking existing job:", error);
      }
    };

    checkExistingJob();
  }, [jobType, inputParamsString]);

  const submitJob = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(`${RUNPACK_API_BASE_URL}/api/jobs/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RUNPACK_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          job_type: jobType,
          input_params: JSON.parse(inputParamsString),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error submitting job: ${response.statusText}`);
      }

      const data = await response.json();
      setJob({
        job_id: data.job_id,
        status: data.status || "pending",
        message: data.message,
        result: data.result,
      });
    } catch (error: unknown) {
      setError(
        `Failed to submit job: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }, [jobType, inputParamsString]);

  const refreshStatus = useCallback(async () => {
    if (!job?.job_id) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${RUNPACK_API_BASE_URL}/api/jobs/${job.job_id}`,
        {
          headers: {
            Authorization: `Bearer ${RUNPACK_API_KEY}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Error fetching job status: ${response.statusText}`);
      }

      const data = await response.json();
      setJob({
        job_id: data.job_id,
        status: data.status,
        message: data.message,
        result: data.result,
      });
    } catch (error: unknown) {
      setError(
        `Failed to fetch job status: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  }, [job?.job_id]);

  return {
    job,
    result,
    error,
    isLoading,
    submitJob,
    refreshStatus,
  };
};
