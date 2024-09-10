import {
  DendroJob,
  FindJobsRequest,
  isFindJobsResponse,
} from "app/dendro/dendro-types";
import { useCallback, useEffect, useState } from "react";
import { apiPostDendroRequest } from "./apiPostDendroRequest";

export const useJobProducingOutput = (nwbFileUrl: string | undefined) => {
  const [job, setJob] = useState<DendroJob | null | undefined>(undefined);
  const [refreshCode, setRefreshCode] = useState(0);
  const refresh = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    let canceled = false;
    setJob(undefined);
    if (!nwbFileUrl) {
      setJob(null);
      return;
    }
    (async () => {
      const j = await getJobProducingOutput(nwbFileUrl);
      setJob(j);
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFileUrl, refreshCode]);
  return { job, refresh };
};

export const getJobProducingOutput = async (nwbFileUrl: string) => {
  const req: FindJobsRequest = {
    type: "findJobsRequest",
    outputFileUrl: nwbFileUrl,
    limit: 1,
  };
  const resp = await apiPostDendroRequest("findJobs", req);
  if (!isFindJobsResponse(resp)) {
    console.error("Invalid response", resp);
    return null;
  }
  const jobs = resp.jobs;
  if (jobs.length === 0) {
    return null;
  }
  return jobs[0];
};

export const useDownstreamJobsForInput = (nwbFileUrl: string) => {
  const [jobs, setJobs] = useState<DendroJob[]>([]);
  const [refreshCode, setRefreshCode] = useState(0);
  const refresh = useCallback(() => {
    setRefreshCode((c) => c + 1);
  }, []);
  useEffect(() => {
    let canceled = false;
    setJobs([]);
    (async () => {
      const j = await getDownstreamJobsForInput(nwbFileUrl);
      if (!canceled) {
        setJobs(j);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [nwbFileUrl, refreshCode]);
  return { jobs, refresh };
};

export const getDownstreamJobsForInput = async (nwbFileUrl: string) => {
  const req: FindJobsRequest = {
    type: "findJobsRequest",
    inputFileUrl: nwbFileUrl,
  };
  const resp = await apiPostDendroRequest("findJobs", req);
  if (!isFindJobsResponse(resp)) {
    console.error("Invalid response", resp);
    return [];
  }
  return resp.jobs;
};
