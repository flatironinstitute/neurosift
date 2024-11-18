import { FunctionComponent, useEffect, useMemo, useState } from "react";
import JobsTable from "./JobsTable";
import { SmallIconButton } from "@fi-sci/misc";
import { Delete, Refresh } from "@mui/icons-material";
import { DendroJobStatus } from "./dendro-types";
import { useJobs } from "./hooks";

type JobsViewProps = {
  serviceName?: string;
  computeClientId?: string;
  tags?: string[];
  allowDeleteJobs: boolean;
  onSelectedJobIdsChanged?: (selectedJobIds: string[]) => void;
};

type JobFilter = {
  status?: DendroJobStatus;
  appName?: string;
  processorName?: string;
};

const dendroJobStatusOptions = [
  "pending",
  "starting",
  "running",
  "completed",
  "failed",
];

const pageSize = 20;

const JobsView: FunctionComponent<JobsViewProps> = ({
  computeClientId,
  serviceName,
  tags,
  allowDeleteJobs,
  onSelectedJobIdsChanged,
}) => {
  const [maxNumJobs, setMaxNumJobs] = useState(pageSize);
  const [filter, setFilter] = useState<JobFilter>({});
  useEffect(() => {
    setMaxNumJobs(pageSize);
  }, [filter]);
  const { jobs, deleteJobs, refreshJobs } = useJobs({
    computeClientId,
    serviceName,
    maxNumJobs,
    appName: filter.appName,
    processorName: filter.processorName,
    status: filter.status,
    tags,
  });
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  useEffect(() => {
    if (onSelectedJobIdsChanged) {
      onSelectedJobIdsChanged(selectedJobIds);
    }
  }, [onSelectedJobIdsChanged, selectedJobIds]);
  useEffect(() => {
    if (!jobs) return;
    // make sure we aren't selecting any jobs that no longer exist
    const existingJobsIds = new Set(jobs.map((j) => j.jobId));
    setSelectedJobIds((selectedJobIds) =>
      selectedJobIds.some((id) => !existingJobsIds.has(id))
        ? selectedJobIds.filter((id) => existingJobsIds.has(id))
        : selectedJobIds,
    );
  }, [jobs]);
  const appProcessorPairs = useMemo(() => {
    const a: string[] = [];
    for (const job of jobs || []) {
      const str = `${job.jobDefinition.appName}::${job.jobDefinition.processorName}`;
      if (!a.includes(str)) {
        a.push(str);
      }
    }
    return a.map((str) => {
      const parts = str.split("::");
      return { appName: parts[0], processorName: parts[1] };
    });
  }, [jobs]);
  // if the app changed, reset the processor
  useEffect(() => {
    setFilter((f) => ({ ...f, processorName: undefined }));
  }, []);
  if (!jobs) {
    return (
      // Leave some room so that the page doesn't jump around as much when the jobs are loaded
      <div style={{ height: 500 }}>Loading jobs</div>
    );
  }
  return (
    <div>
      <div>
        <SmallIconButton
          title="Refresh jobs"
          icon={<Refresh />}
          onClick={refreshJobs}
        />
        {selectedJobIds.length > 0 && allowDeleteJobs && (
          <SmallIconButton
            icon={<Delete />}
            title="Delete selected jobs"
            onClick={() => {
              const ok = window.confirm(
                `Delete ${selectedJobIds.length} jobs?`,
              );
              if (!ok) return;
              deleteJobs(selectedJobIds);
            }}
          />
        )}
        &nbsp;
        <FilterSelector
          filter={filter}
          setFilter={setFilter}
          appProcessorPairs={appProcessorPairs}
        />
      </div>
      <div>&nbsp;</div>
      <JobsTable
        jobs={jobs}
        selectedJobIds={selectedJobIds}
        onSelectedJobIdsChanged={setSelectedJobIds}
      />
      {(jobs?.length || 0) >= maxNumJobs && (
        <div>
          <button onClick={() => setMaxNumJobs(maxNumJobs + pageSize * 3)}>
            Show more
          </button>
        </div>
      )}
    </div>
  );
};

type FilterSelectorProps = {
  filter: JobFilter;
  setFilter: (filter: JobFilter) => void;
  appProcessorPairs: { appName: string; processorName: string }[];
};

const FilterSelector: FunctionComponent<FilterSelectorProps> = ({
  filter,
  setFilter,
  appProcessorPairs,
}) => {
  const allAppNames = useMemo(() => {
    const a: string[] = [];
    for (const x of appProcessorPairs) {
      if (!a.includes(x.appName)) {
        a.push(x.appName);
      }
    }
    return a;
  }, [appProcessorPairs]);
  const allProcessorNames = useMemo(() => {
    if (filter.appName) {
      const a: string[] = [];
      for (const x of appProcessorPairs) {
        if (x.appName === filter.appName) {
          a.push(x.processorName);
        }
      }
      return a;
    } else {
      const a: string[] = [];
      for (const x of appProcessorPairs) {
        if (!a.includes(x.processorName)) {
          a.push(x.processorName);
        }
      }
      return a;
    }
  }, [appProcessorPairs, filter.appName]);
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <div>
        <select
          value={filter.status || ""}
          onChange={(e) => {
            const status = e.target.value as DendroJobStatus;
            setFilter({ ...filter, status });
          }}
        >
          <option value={""}>[Status]</option>
          {dendroJobStatusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={filter.appName || ""}
          onChange={(e) => {
            const appName = e.target.value;
            setFilter({ ...filter, appName });
          }}
        >
          <option value={""}>[App]</option>
          {allAppNames.map((appName) => (
            <option key={appName} value={appName}>
              {appName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={filter.processorName || ""}
          onChange={(e) => {
            const processorName = e.target.value;
            setFilter({ ...filter, processorName });
          }}
        >
          <option value={""}>[Processor]</option>
          {allProcessorNames.map((processorName) => (
            <option key={processorName} value={processorName}>
              {processorName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default JobsView;
