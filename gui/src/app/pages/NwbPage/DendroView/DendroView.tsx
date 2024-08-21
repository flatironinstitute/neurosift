import { DendroJob } from "app/dendro/dendro-types";
import { FunctionComponent, useEffect, useState } from "react";
import { useNwbFile } from "../NwbFileContext";
import JobView from "./JobView";
import {
  getJobProducingOutput,
  useJobProducingOutput,
} from "./useJobProducingOutput";

type DendroViewProps = {
  width: number;
  height: number;
};

const DendroView: FunctionComponent<DendroViewProps> = ({ width, height }) => {
  const nwbFile = useNwbFile();
  const nwbFileUrl = nwbFile.getUrls()[0];
  const job = useJobProducingOutput(nwbFileUrl);

  if (!nwbFile) return <div>No NWB file</div>;
  if (!nwbFileUrl) return <div>No NWB URL</div>;
  if (job === undefined) {
    return <div>Loading...</div>;
  }
  if (job === null) {
    return <div>No Dendro provenance for this file.</div>;
  }
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        overflow: "auto",
      }}
    >
      <h3>This file was produced by a Dendro job</h3>
      <JobProvenanceList job={job} />
      <hr />
      <JobView job={job} refreshJob={undefined} />
    </div>
  );
};

type JobProvenanceListProps = {
  job: DendroJob;
};

const JobProvenanceList: FunctionComponent<JobProvenanceListProps> = ({
  job,
}) => {
  const jobList = useJobProvenanceList(job);
  return (
    <div>
      {jobList
        .slice()
        .reverse()
        .map((job, i) => (
          <span key={job.jobId}>
            <>
              <a
                href={`https://dendro.vercel.app/job/${job.jobId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobDefinition.processorName}
              </a>
            </>
            {i < jobList.length - 1 && <>&nbsp;|&nbsp;</>}
          </span>
        ))}
    </div>
  );
};

const useJobProvenanceList = (job: DendroJob) => {
  const [jobList, setJobList] = useState<DendroJob[]>([]);
  useEffect(() => {
    let canceled = false;
    const load = async () => {
      const jobIdsHandled: Set<string> = new Set();
      const list: DendroJob[] = [];
      const addJob = (j: DendroJob) => {
        if (canceled) return;
        const existingJob = list.find((x) => x.jobId === j.jobId);
        if (existingJob) return;
        list.push(j);
        setJobList([...list]);
      };
      addJob(job);
      const handleJob = async (j: DendroJob) => {
        for (const x of j.jobDefinition.inputFiles) {
          if (canceled) return;
          const newJob = await getJobProducingOutput(x.url);
          if (newJob) {
            addJob(newJob);
          }
        }
      };
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let handledSomething = false;
        for (const j of list) {
          if (canceled) return;
          if (jobIdsHandled.has(j.jobId)) continue;
          jobIdsHandled.add(j.jobId);
          await handleJob(j);
          handledSomething = true;
        }
        if (!handledSomething) {
          break;
        }
      }
    };
    load();
    return () => {
      canceled = true;
    };
  }, [job]);
  return jobList;
};

export default DendroView;
