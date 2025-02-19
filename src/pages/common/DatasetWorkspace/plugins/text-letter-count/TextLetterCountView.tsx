import { FunctionComponent, useEffect, useMemo, useState } from "react";
import { DatasetPluginProps } from "../pluginInterface";
import { useNeurosiftJob } from "@jobManager/useNeurosiftJob";
import { JobStatusHandler } from "@jobManager/components/JobStatusHandler";

interface LetterCounts {
  [key: string]: number;
}

interface Result {
  letterCounts: LetterCounts;
  totalLetters: number;
}

interface JobResult {
  outputUrl: string; // for the result.json
}

interface JobInput {
  fileUrl: string;
  version: number;
}

const TextLetterCountView: FunctionComponent<DatasetPluginProps> = ({
  file,
}) => {
  const fileUrl = file.urls[0];
  const input = useMemo<JobInput>(() => ({ fileUrl, version: 6 }), [fileUrl]);

  const {
    job,
    result: jobResult,
    error,
    isRefreshing,
    submitJob,
    fetchJobStatus,
  } = useNeurosiftJob<JobInput, JobResult>("text-letter-count", input);

  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    if (jobResult) {
      fetch(jobResult.outputUrl)
        .then((response) => response.json())
        .then((data) => setResult(data));
    }
  }, [jobResult]);

  if (job?.status !== "completed") {
    return (
      <JobStatusHandler
        job={job}
        error={error}
        isRefreshing={isRefreshing}
        onSubmit={submitJob}
        onRefresh={fetchJobStatus}
        jobLabel="Analyze Letter Frequencies"
      />
    );
  }

  if (!jobResult) {
    return <div>Job completed but no result found</div>;
  }

  if (!result) {
    return <div>Loading result...</div>;
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
