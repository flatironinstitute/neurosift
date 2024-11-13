import { useNwbFile } from "../../../misc/NwbFileContext";
import { FunctionComponent, useMemo, useReducer, useState } from "react";
import {
  AllJobsTreeRow,
  CreateJobComponent,
  Expander,
  ViewInNeurosiftLink,
  expandedJobIdsReducer,
  isStagingUrl,
  parameterElementForJob,
  rowIsVisible,
} from "../../ElectricalSeriesItemView/SpikeSortingView/SpikeSortingView";
import { useAllJobs, useJob } from "../../CEBRA/DendroHelpers";
import { JobInfoView } from "../../CEBRA/DendroItemView";
import {
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
} from "../../../misc/dendro/dendro-types";
import InputChoices from "../../ElectricalSeriesItemView/SpikeSortingView/InputChoices";
import { Hyperlink, SmallIconButton } from "@fi-sci/misc";
import { OpenInNew, Refresh } from "@mui/icons-material";
import { timeAgoString } from "../../../utils/timeStrings";

const tagsBase = ["neurosift", "units_cebra"];
const tagsUnitsCEBRA = [...tagsBase, "UnitsCEBRA"];

type UnitsCEBRAOpts = {
  max_iterations: number;
  batch_size: number;
  bin_size_msec: number;
  output_dimensions: number;
};

const defaultUnitsCEBRAOpts = {
  max_iterations: 1000,
  batch_size: 1000,
  bin_size_msec: 20,
  output_dimensions: 5,
};

type UnitsCEBRAViewProps = {
  width: number;
  height: number;
  path: string;
};

const UnitsCEBRAView: FunctionComponent<UnitsCEBRAViewProps> = ({
  width,
  height,
  path,
}) => {
  const nwbFile = useNwbFile();
  if (!nwbFile)
    throw Error("Unexpected: nwbFile is undefined (no context provider)");

  const nwbUrl = useMemo(() => {
    return (nwbFile.sourceUrls || [])[0];
  }, [nwbFile]);

  const { allJobs, refreshAllJobs } = useAllUnitsCEBRAJobs(nwbUrl);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(
    undefined,
  );

  const selectedJob = useMemo(() => {
    if (!selectedJobId) return undefined;
    return allJobs?.find((j) => j.jobId === selectedJobId);
  }, [selectedJobId, allJobs]);

  return (
    <div style={{ width, height, overflow: "auto" }}>
      <h3>CEBRA</h3>
      <hr />
      <AllJobsTree
        allJobs={allJobs || undefined}
        refreshAllJobs={refreshAllJobs}
        selectedJobId={selectedJobId}
        setSelectedJobId={setSelectedJobId}
        unitsPath={path}
      />
      <CreateUnitsCEBRAJobComponent
        nwbUrl={nwbUrl}
        path={path}
        onNewJobId={(jobId) => {
          refreshAllJobs();
          setSelectedJobId(jobId);
        }}
      />
      <hr />
      {selectedJobId &&
        selectedJob &&
        (selectedJob.tags.includes("UnitsCEBRA") ? (
          <UnitsCEBRAJobView jobId={selectedJobId} nwbUrl={nwbUrl} />
        ) : (
          <div>Unexpected job type: {selectedJob.tags.join(", ")}</div>
        ))}
    </div>
  );
};

const useAllUnitsCEBRAJobs = (nwbUrl: string) => {
  const tags = useMemo(() => [...tagsBase, `nwb:${nwbUrl}`], [nwbUrl]);
  const { allJobs, refreshAllJobs } = useAllJobs({
    serviceName: "hello_world_service",
    appName: undefined,
    processorName: undefined,
    tags,
    inputFileUrl: undefined,
    jobFilter: undefined,
  });
  return { allJobs, refreshAllJobs };
};

type CreateUnitsCEBRAJobComponentProps = {
  nwbUrl: string;
  path: string;
  onNewJobId: (jobId: string) => void;
};

const CreateUnitsCEBRAJobComponent: FunctionComponent<
  CreateUnitsCEBRAJobComponentProps
> = ({ nwbUrl, path, onNewJobId }) => {
  const [opts, setOpts] = useState<UnitsCEBRAOpts>(defaultUnitsCEBRAOpts);
  const requiredResources: DendroJobRequiredResources = useMemo(() => {
    return {
      numCpus: 4,
      numGpus: 0,
      memoryGb: 8,
      timeSec: 60 * 60 * 3,
    };
  }, []);

  const jobDefinition: DendroJobDefinition | undefined = useMemo(() => {
    return {
      appName: "hello_cebra",
      processorName: "cebra_nwb_embedding_6",
      inputFiles: [
        {
          name: "input",
          fileBaseName: nwbUrl.endsWith(".lindi.tar")
            ? "input.nwb.lindi.tar"
            : nwbUrl.endsWith(".lindi.json")
              ? "input.nwb.lindi.json"
              : "input.nwb",
          url: nwbUrl,
        },
      ],
      outputFiles: [
        {
          name: "output",
          fileBaseName: "output.nwb.lindi.tar",
        },
      ],
      parameters: [
        {
          name: "units_path",
          value: path,
        },
        {
          name: "max_iterations",
          value: opts.max_iterations,
        },
        {
          name: "batch_size",
          value: opts.batch_size,
        },
        {
          name: "bin_size_msec",
          value: opts.bin_size_msec,
        },
        {
          name: "output_dimensions",
          value: opts.output_dimensions,
        },
      ],
    };
  }, [nwbUrl, path, opts]);

  const tagsUnitsCEBRA_2 = useMemo(
    () => [...tagsUnitsCEBRA, `nwb:${nwbUrl}`],
    [nwbUrl],
  );

  const jobDependencies = useMemo(() => {
    return [];
  }, []);

  const selectOptsComponent = (
    <SelectUnitsCEBRAOpts opts={opts} setOpts={setOpts} />
  );

  if (!jobDefinition) return <div>No job definition</div>;
  return (
    <CreateJobComponent
      buttonLabel="Run CEBRA"
      selectOptsComponent={selectOptsComponent}
      jobDefinition={jobDefinition}
      requiredResources={requiredResources}
      tags={tagsUnitsCEBRA_2}
      jobDependencies={jobDependencies}
      onNewJobId={onNewJobId}
      staging={isStagingUrl(nwbUrl)}
    />
  );
};

type UnitsCEBRAJobViewProps = {
  jobId: string;
  nwbUrl: string;
};

const parameterNamesForUnitsCEBRAJob = [
  "max_iterations",
  "batch_size",
  "bin_size_msec",
  "output_dimensions",
];

const UnitsCEBRAJobView: FunctionComponent<UnitsCEBRAJobViewProps> = ({
  jobId,
  nwbUrl,
}) => {
  const { job, refreshJob } = useJob(jobId);
  if (!job) return <div>Loading job...</div>;
  return (
    <div>
      <JobInfoView
        job={job}
        onRefreshJob={refreshJob}
        parameterNames={parameterNamesForUnitsCEBRAJob}
      />
      <ViewInNeurosiftLink job={job} />
    </div>
  );
};

type SelectUnitsCEBRAOptsProps = {
  opts: UnitsCEBRAOpts;
  setOpts: (opts: UnitsCEBRAOpts) => void;
};

const SelectUnitsCEBRAOpts: FunctionComponent<SelectUnitsCEBRAOptsProps> = ({
  opts,
  setOpts,
}) => {
  return (
    <div>
      <table>
        <tbody>
          <tr>
            <td>Max iterations</td>
            <td>
              <InputChoices
                value={opts.max_iterations}
                choices={[100, 500, 1000, 5000, 10000]}
                onChange={(value) =>
                  setOpts({ ...opts, max_iterations: value as number })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Batch size</td>
            <td>
              <InputChoices
                value={opts.batch_size}
                choices={[1000]}
                onChange={(value) =>
                  setOpts({ ...opts, batch_size: value as number })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Bin size (msec)</td>
            <td>
              <InputChoices
                value={opts.bin_size_msec}
                choices={[20]}
                onChange={(value) =>
                  setOpts({ ...opts, bin_size_msec: value as number })
                }
              />
            </td>
          </tr>
          <tr>
            <td>Output dimensions</td>
            <td>
              <InputChoices
                value={opts.output_dimensions}
                choices={[3, 5, 10]}
                onChange={(value) =>
                  setOpts({ ...opts, output_dimensions: value as number })
                }
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

type AllJobsTreeProps = {
  allJobs: DendroJob[] | undefined;
  refreshAllJobs: () => void;
  selectedJobId: string | undefined;
  setSelectedJobId: (jobId: string) => void;
  unitsPath: string;
};

export const AllJobsTree: FunctionComponent<AllJobsTreeProps> = ({
  allJobs,
  refreshAllJobs,
  selectedJobId,
  setSelectedJobId,
  unitsPath,
}) => {
  const [expandedJobIds, dispatchExpandedJobIds] = useReducer(
    expandedJobIdsReducer,
    {},
  );
  const rows = useMemo(() => {
    const ret: AllJobsTreeRow[] = [];
    const handleUnitsCEBRAJobs = () => {
      for (const job of allJobs || []) {
        if (job.tags.includes("UnitsCEBRA")) {
          const pp = job.jobDefinition.parameters.find(
            (p) => p.name === "units_path",
          );
          if (pp && pp.value === unitsPath) {
            const row: AllJobsTreeRow = { job, indent: 0 };
            ret.push(row);
          }
        }
      }
    };
    handleUnitsCEBRAJobs();
    return ret;
  }, [allJobs, unitsPath]);
  const createIndent = (n: number) => {
    return (
      <span>
        {new Array(n).fill(0).map(() => (
          <>&nbsp;&nbsp;&nbsp;&nbsp;</>
        ))}
      </span>
    );
  };
  if (!allJobs) return <div>Loading jobs...</div>;
  return (
    <div>
      <div>
        <SmallIconButton icon={<Refresh />} onClick={refreshAllJobs} />
      </div>
      <table className="nwb-table">
        <thead>
          <tr>
            <th></th>
            <th>Job</th>
            <th>Status</th>
            <th>Created</th>
            <th>Parameters</th>
            {<th />}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => rowIsVisible(expandedJobIds, r))
            .map((row) => (
              <tr
                key={row.job.jobId}
                style={
                  row.job.jobId === selectedJobId
                    ? { background: "#afafaf" }
                    : {}
                }
              >
                <td>
                  {row.hasChildren && (
                    <Expander
                      expanded={expandedJobIds[row.job.jobId]}
                      onClick={() =>
                        dispatchExpandedJobIds({
                          type: "toggle",
                          jobId: row.job.jobId,
                        })
                      }
                    />
                  )}
                </td>
                <td>
                  {createIndent(row.indent)}
                  <Hyperlink onClick={() => setSelectedJobId(row.job.jobId)}>
                    {row.job.jobDefinition.processorName}
                  </Hyperlink>
                </td>
                <td>{row.job.status}</td>
                <td>{timeAgoString(row.job.timestampCreatedSec)}</td>
                <td>{parameterElementForJob(row.job)}</td>
                <td>
                  <SmallIconButton
                    icon={<OpenInNew />}
                    onClick={() => {
                      window.open(
                        `https://dendro.vercel.app/job/${row.job.jobId}`,
                        "_blank",
                      );
                    }}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default UnitsCEBRAView;
