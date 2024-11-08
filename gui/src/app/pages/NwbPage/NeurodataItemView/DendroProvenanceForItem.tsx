import { FunctionComponent, useEffect, useState } from "react";
import { useJobProducingOutput } from "../DendroView/useJobProducingOutput";
import { useNwbFile } from "neurosift-lib/misc/NwbFileContext";
import {
  DendroJob,
  GetJobRequest,
  isGetJobResponse,
} from "app/dendro/dendro-types";
import { apiPostDendroRequest } from "../DendroView/apiPostDendroRequest";

type DendroProvenanceForItemProps = {
  path: string;
  otherPaths?: string[];
};

const DendroProvenanceForItem: FunctionComponent<
  DendroProvenanceForItemProps
> = ({ path, otherPaths }) => {
  const nwbFile = useNwbFile();
  const [dendroJobIds, setDendroJobIds] = useState<string[] | undefined>(
    undefined,
  );
  useEffect(() => {
    let canceled = false;
    setDendroJobIds(undefined);
    (async () => {
      const jobIds: string[] = [];
      for (const p of [path, ...(otherPaths || [])]) {
        const grp = await nwbFile.getGroup(p);
        if (canceled) return;
        if (!grp) {
          setDendroJobIds([]);
          return;
        }
        const description = grp.attrs["description"] as string;
        if (!description) {
          setDendroJobIds([]);
          return;
        }
        const descriptionParts = description.split(" ");
        const jj = descriptionParts
          .filter((part) => part.startsWith("dendro:"))
          .map((part) => part.slice("dendro:".length).trim());
        jobIds.push(...jj);
      }
      setDendroJobIds(jobIds);
    })();
    return () => {
      canceled = true;
    };
  }, [path, otherPaths, nwbFile]);
  const dendroJobs = useDendroJobs(dendroJobIds);
  if (dendroJobIds === undefined) return <>...</>;
  if (dendroJobIds.length === 0) return <span />;
  if (!dendroJobs) return <>......</>;
  return (
    <span>
      Dendro:{" "}
      {dendroJobs
        .slice()
        .reverse()
        .map((job, i) => (
          <div key={i}>
            {job ? (
              <a
                href={`https://dendro.vercel.app/job/${job.jobId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobDefinition.processorName}
              </a>
            ) : (
              <span>job-not-found:{dendroJobIds![i]}</span>
            )}
          </div>
        ))}
    </span>
  );
};

const useDendroJobs = (
  jobIds: string[] | undefined,
): (DendroJob | null)[] | undefined => {
  const [ret, setRet] = useState<(DendroJob | null)[] | undefined>(undefined);
  useEffect(() => {
    let canceled = false;
    if (!jobIds) {
      setRet([]);
      return;
    }
    (async () => {
      const jj: (DendroJob | null)[] = [];
      for (const jobId of jobIds) {
        const job = await getJob(jobId);
        if (canceled) return;
        jj.push(job);
      }
      setRet(jj);
    })();
    return () => {
      canceled = true;
    };
  }, [jobIds]);
  return ret;
};

const getJob = async (jobId: string): Promise<DendroJob | null> => {
  const req: GetJobRequest = {
    type: "getJobRequest",
    jobId: jobId,
    includePrivateKey: false,
  };
  const resp = await apiPostDendroRequest("getJob", req);
  if (!isGetJobResponse(resp)) {
    console.error("Invalid response", resp);
    return null;
  }
  return resp.job || null;
};

export default DendroProvenanceForItem;
