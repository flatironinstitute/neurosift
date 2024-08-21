import {
  DendroJob,
  FindJobsRequest,
  isFindJobsResponse,
} from "app/dendro/dendro-types";
import { useEffect, useState } from "react";
import { apiPostDendroRequest } from "./apiPostDendroRequest";

export const useJobProducingOutput = (nwbFileUrl: string) => {
  const [job, setJob] = useState<DendroJob | null | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    setJob(undefined);
    (async () => {
      const req: FindJobsRequest = {
        type: "findJobsRequest",
        outputFileUrl: nwbFileUrl,
        limit: 1,
      };
      const resp = await apiPostDendroRequest("findJobs", req);
      if (canceled) return;
      if (!isFindJobsResponse(resp)) {
        console.error("Invalid response", resp);
        return;
      }
      const jobs = resp.jobs;
      if (jobs.length === 0) {
        setJob(null);
        return;
      }
      setJob(jobs[0]);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFileUrl]);
  return job;
};
