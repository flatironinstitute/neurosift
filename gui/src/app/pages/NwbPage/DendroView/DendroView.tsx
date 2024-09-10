import { DendroJob } from "app/dendro/dendro-types";
import { timeAgoString } from "app/timeStrings";
import useRoute, { Route } from "app/useRoute";
import { FunctionComponent, useCallback, useEffect, useState } from "react";
import { useNwbFile } from "../NwbFileContext";
import {
  getJobProducingOutput,
  useDownstreamJobsForInput,
  useJobProducingOutput,
} from "./useJobProducingOutput";

type DendroViewProps = {
  width: number;
  height: number;
};

const DendroView: FunctionComponent<DendroViewProps> = ({ width, height }) => {
  const nwbFile = useNwbFile();
  const nwbFileUrl = (nwbFile.sourceUrls || [])[0];
  const { job: jobProducingFile, refresh: refreshJobProducingOutput } =
    useJobProducingOutput(nwbFileUrl);
  const { jobs: downstreamJobs, refresh: refreshDownstreamJobs } =
    useDownstreamJobsForInput(nwbFileUrl);

  const { route } = useRoute();

  const handleRefresh = useCallback(() => {
    refreshJobProducingOutput();
    refreshDownstreamJobs();
  }, [refreshJobProducingOutput, refreshDownstreamJobs]);

  if (!nwbFile) return <div>No NWB file</div>;
  if (!nwbFileUrl) return <div>No NWB URL</div>;
  if (jobProducingFile === undefined) {
    return <div>Loading job producing output...</div>;
  }
  if (downstreamJobs === undefined) {
    return <div>Loading downstream jobs...</div>;
  }
  if (jobProducingFile === null && downstreamJobs.length === 0) {
    return (
      <div>
        No Dendro provenance for this file.{" "}
        <button onClick={handleRefresh}>Refresh</button>
      </div>
    );
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
      <div style={{ paddingTop: 15 }}>
        <button onClick={handleRefresh}>Refresh</button>
      </div>
      {jobProducingFile && (
        <div>
          <h3>This file was produced by a Dendro job</h3>
          <JobProvenanceList job={jobProducingFile} />
        </div>
      )}
      <hr />
      {downstreamJobs.length > 0 && (
        <div>
          <h3>This file was used as input for the following Dendro jobs</h3>
          {downstreamJobs.map((job) => (
            <div key={job.jobId}>
              <a
                href={`https://dendro.vercel.app/job/${job.jobId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {job.jobDefinition.processorName}
              </a>{" "}
              ({job.status} -{" "}
              {timeAgoString(
                job.timestampFinishedSec || job.timestampCreatedSec,
              )}
              )
              <div style={{ paddingLeft: 20 }}>
                {job.outputFileResults.map((outputFile) => (
                  <span key={outputFile.name}>
                    {job.status === "completed" &&
                    outputFile.fileBaseName.endsWith(".nwb.lindi.tar") ? (
                      <>
                        <a
                          href={createNeurosiftLinkForJobOutput(
                            route,
                            outputFile.url,
                            outputFile.fileBaseName,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {outputFile.name}
                        </a>
                      </>
                    ) : (
                      <>{outputFile.name}</>
                    )}{" "}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const createNeurosiftLinkForJobOutput = (
  route: Route,
  url: string,
  name: string,
) => {
  if (route.page !== "nwb") throw new Error("Unexpected route");
  let ret = `https://neurosift.app/?p=/nwb&url=${url}`;
  if (route.dandisetId) {
    ret = `${ret}&dandisetId=${route.dandisetId}`;
  }
  if (route.dandisetVersion) {
    ret = `${ret}&dandisetVersion=${route.dandisetVersion}`;
  }
  if (name.endsWith(".lindi.tar") || name.endsWith(".lindi.json")) {
    ret = `${ret}&st=lindi`;
  }
  return ret;
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
