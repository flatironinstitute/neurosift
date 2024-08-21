import {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import LogPlot from "./LogPlot";
import { Hyperlink } from "@fi-sci/misc";
import { DendroJob } from "app/dendro/dendro-types";

type ResourceUtilizationViewProps = {
  job: DendroJob;
  displayJobId: boolean;
};

type ResourceUtilizationLog = ResourceUtilizationLogLine[];

type ResourceUtilizationLogLine = {
  timestamp: number;
  cpu: {
    percent: number;
  };
  virtual_memory: {
    total: number;
    available: number;
    percent: number;
    used: number;
    free: number;
    active: number;
    inactive: number;
    buffers: number;
    cached: number;
    shared: number;
    slab: number;
  };
  disk_io_counters: {
    read_count: number;
    write_count: number;
    read_bytes: number;
    write_bytes: number;
    read_time: number;
    write_time: number;
  } | null;
  net_io_counters: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    errin: number;
    errout: number;
    dropin: number;
    dropout: number;
  };
  gpu: {
    loads: number[];
  } | null;
};

const useResourceUtilizationLog = (job: DendroJob) => {
  const [resourceUtilizationLogText, setResourceUtilizationLogText] = useState<
    string | undefined
  >();
  const [refreshCode, setRefreshCode] = useState(0);
  const refreshResourceUtilizationLog = useCallback(() => {
    setRefreshCode((rc) => rc + 1);
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      setResourceUtilizationLogText(undefined);
      if (job?.resourceUtilizationLogUrl) {
        // fetch resource utilization log
        const resp = await fetch(job.resourceUtilizationLogUrl);
        if (resp.ok) {
          const text = await resp.text();
          if (canceled) return;
          setResourceUtilizationLogText(text);
        }
      }
    })();
    return () => {
      canceled = true;
    };
  }, [job, refreshCode]);

  const resourceUtilizationLog: ResourceUtilizationLog = useMemo(() => {
    const lines = resourceUtilizationLogText?.split("\n") || [];
    const ret: ResourceUtilizationLogLine[] = [];
    for (const line of lines) {
      try {
        ret.push(JSON.parse(line));
      } catch (e) {
        // ignore
      }
    }
    return ret;
  }, [resourceUtilizationLogText]);

  return { resourceUtilizationLog, refreshResourceUtilizationLog };
};

const ResourceUtilizationView: FunctionComponent<
  ResourceUtilizationViewProps
> = ({ job, displayJobId }) => {
  const { resourceUtilizationLog, refreshResourceUtilizationLog } =
    useResourceUtilizationLog(job);
  const referenceTime =
    resourceUtilizationLog && resourceUtilizationLog.length > 0
      ? resourceUtilizationLog[0].timestamp
      : 0;

  const handleDownloadCsv = useCallback(() => {
    const headerLine =
      "timestamp,cpu_percent,memory_used,memory_total,network_sent,network_received,disk_read,disk_write";
    const lines = resourceUtilizationLog.map((l) => {
      const cpuPercent = l.cpu.percent;
      const memoryUsed = l.virtual_memory.used / 1024 / 1024 / 1024;
      const memoryTotal = l.virtual_memory.total / 1024 / 1024 / 1024;
      const networkSent =
        (l.net_io_counters?.bytes_sent || 0) / 1024 / 1024 / 1024;
      const networkReceived =
        (l.net_io_counters?.bytes_recv || 0) / 1024 / 1024 / 1024;
      const diskRead =
        (l.disk_io_counters?.read_bytes || 0) / 1024 / 1024 / 1024;
      const diskWrite =
        (l.disk_io_counters?.write_bytes || 0) / 1024 / 1024 / 1024;
      return `${l.timestamp},${cpuPercent},${memoryUsed},${memoryTotal},${networkSent},${networkReceived},${diskRead},${diskWrite}`;
    });
    const csv = lines.join("\n");
    const csv2 = headerLine + "\n" + csv;
    const blob = new Blob([csv2], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource_utilization_${job.jobId}.csv`;
    a.click();
  }, [resourceUtilizationLog, job]);

  const handleDownloadJsonl = useCallback(() => {
    const lines = resourceUtilizationLog.map((l) => JSON.stringify(l));
    const jsonl = lines.join("\n");
    const blob = new Blob([jsonl], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resource_utilization_${job.jobId}.jsonl`;
    a.click();
  }, [resourceUtilizationLog, job]);

  const [cumulative, setCumulative] = useState(false);

  return (
    <div>
      <div>
        <Hyperlink onClick={refreshResourceUtilizationLog}>
          {displayJobId
            ? `Refresh resource utilization for job ${job.jobId} (${job.jobDefinition.processorName})`
            : `Refresh resource utilization`}
        </Hyperlink>
        &nbsp;
        <CumulativeToggle value={cumulative} setValue={setCumulative} />
      </div>
      <hr />
      {/* CPU Percent */}
      <LogPlot
        series={[
          {
            label: "CPU percent",
            data: resourceUtilizationLog.map((l) => ({
              x: l.timestamp,
              y: l.cpu.percent,
            })),
            color: "black",
          },
        ]}
        referenceTime={referenceTime}
        yAxisLabel="CPU percent"
      />
      {/* Memory */}
      <LogPlot
        series={[
          {
            label: "Memory used",
            data: resourceUtilizationLog.map((l) => ({
              x: l.timestamp,
              y: l.virtual_memory.used / 1024 / 1024 / 1024,
            })),
            color: "red",
          },
          {
            label: "Total memory",
            data: resourceUtilizationLog.map((l) => ({
              x: l.timestamp,
              y: l.virtual_memory.total / 1024 / 1024 / 1024,
            })),
            color: "black",
          },
        ]}
        referenceTime={referenceTime}
        yAxisLabel="Memory (GB)"
      />
      {/* GPU */}
      <LogPlot
        series={[
          {
            label: "GPU load",
            data: resourceUtilizationLog.map((l) => ({
              x: l.timestamp,
              y: l.gpu ? l.gpu.loads.reduce((a, b) => a + b, 0) : 0,
            })),
            color: "magenta",
          },
        ]}
        referenceTime={referenceTime}
        yAxisLabel="GPU load"
      />
      {/* Network I/O */}
      {cumulative ? (
        <LogPlot
          series={[
            {
              label: "Network sent",
              data: resourceUtilizationLog.map((l) => ({
                x: l.timestamp,
                y: (l.net_io_counters?.bytes_sent || 0) / 1024 / 1024 / 1024,
              })),
              color: "blue",
            },
            {
              label: "Network received",
              data: resourceUtilizationLog.map((l) => ({
                x: l.timestamp,
                y: (l.net_io_counters?.bytes_recv || 0) / 1024 / 1024 / 1024,
              })),
              color: "darkgreen",
            },
          ]}
          referenceTime={referenceTime}
          yAxisLabel="Network IO (GB)"
        />
      ) : (
        <LogPlot
          series={[
            {
              label: "Network sent",
              data: cumulativeToInstantaneous(
                resourceUtilizationLog.map((l) => ({
                  x: l.timestamp,
                  y: (l.net_io_counters?.bytes_sent || 0) / 1024 / 1024,
                })),
              ),
              color: "blue",
            },
            {
              label: "Network received",
              data: cumulativeToInstantaneous(
                resourceUtilizationLog.map((l) => ({
                  x: l.timestamp,
                  y: (l.net_io_counters?.bytes_recv || 0) / 1024 / 1024,
                })),
              ),
              color: "darkgreen",
            },
          ]}
          referenceTime={referenceTime}
          yAxisLabel="Network IO (MB / sec)"
        />
      )}
      {/* Disk I/O */}
      {cumulative ? (
        <LogPlot
          series={[
            {
              label: "Disk read",
              data: resourceUtilizationLog.map((l) => ({
                x: l.timestamp,
                y: (l.disk_io_counters?.read_bytes || 0) / 1024 / 1024,
              })),
              color: "darkgreen",
            },
            {
              label: "Disk write",
              data: resourceUtilizationLog.map((l) => ({
                x: l.timestamp,
                y: (l.disk_io_counters?.write_bytes || 0) / 1024 / 1024,
              })),
              color: "blue",
            },
          ]}
          referenceTime={referenceTime}
          yAxisLabel="Disk IO (GB)"
        />
      ) : (
        <LogPlot
          series={[
            {
              label: "Disk read",
              data: cumulativeToInstantaneous(
                resourceUtilizationLog.map((l) => ({
                  x: l.timestamp,
                  y: (l.disk_io_counters?.read_bytes || 0) / 1024 / 1024,
                })),
              ),
              color: "darkgreen",
            },
            {
              label: "Disk write",
              data: cumulativeToInstantaneous(
                resourceUtilizationLog.map((l) => ({
                  x: l.timestamp,
                  y: (l.disk_io_counters?.write_bytes || 0) / 1024 / 1024,
                })),
              ),
              color: "blue",
            },
          ]}
          referenceTime={referenceTime}
          yAxisLabel="Disk IO (MB / sec)"
        />
      )}
      <hr />
      <button onClick={handleDownloadCsv}>Download .csv</button>
      &nbsp;
      <button onClick={handleDownloadJsonl}>Download .jsonl</button>
    </div>
  );
};

const cumulativeToInstantaneous = (data: { x: number; y: number }[]) => {
  const ret: { x: number; y: number }[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ret.push({ x: data[i].x, y: 0 });
    } else {
      ret.push({
        x: data[i].x,
        y:
          data[i].x > data[i - 1].x
            ? (data[i].y - data[i - 1].y) / (data[i].x - data[i - 1].x)
            : 0,
      });
    }
  }
  return ret;
};

type CumulativeToggleProps = {
  value: boolean;
  setValue: (value: boolean) => void;
};

const CumulativeToggle: FunctionComponent<CumulativeToggleProps> = ({
  value,
  setValue,
}) => {
  return (
    <span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => setValue(e.target.checked)}
      />
      &nbsp; Cumulative for I/O
    </span>
  );
};

export default ResourceUtilizationView;
