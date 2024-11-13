import {
  RemoteH5FileLindi,
  RemoteH5FileX,
  getRemoteH5FileLindi,
} from "../../remote-h5-file/index";
import { FunctionComponent, useEffect, useMemo, useState } from "react";
import {
  AutocorrelogramsView,
  AutocorrelogramsViewData,
} from "./view-autocorrelograms";
import { AutocorrelogramData } from "./view-autocorrelograms/AutocorrelogramsViewData";
import {
  DendroJob,
  DendroJobDefinition,
  DendroJobRequiredResources,
} from "../../misc/dendro/dendro-types";
import { useNwbFile } from "../../misc/NwbFileContext";
import { getJobOutputUrl, removeLeadingSlash } from "../CEBRA/DendroHelpers";
import DendroItemView from "../CEBRA/DendroItemView";

type Props = {
  width: number;
  height: number;
  path: string;
  condensed?: boolean;
};

const correlogramWindowSizeMsecChoices = [100, 500];
const correlogramBinSizeMsecChoices = [0.5, 1, 5];

const adjustableParameters: { name: string; type: "number"; choices: any[] }[] =
  [
    {
      name: "correlogram_window_size_msec",
      type: "number",
      choices: correlogramWindowSizeMsecChoices,
    },
    {
      name: "correlogram_bin_size_msec",
      type: "number",
      choices: correlogramBinSizeMsecChoices,
    },
  ];

const defaultAdjustableParameters = {
  correlogram_window_size_msec: 100,
  correlogram_bin_size_msec: 1,
};

const serviceName = "hello_world_service";
const appName = "hello_neurosift";
const processorName = "units_summary_1";

const getJobDefinition = (
  adjustableParameterValues: { [key: string]: any },
  inputFileUrl: string,
  path: string,
): DendroJobDefinition => {
  return {
    appName,
    processorName,
    inputFiles: [
      {
        name: "input",
        fileBaseName: inputFileUrl.endsWith(".lindi.json")
          ? "input.lindi.json"
          : inputFileUrl.endsWith(".lindi.tar")
            ? "input.lindi.tar"
            : "input.nwb",
        url: inputFileUrl,
      },
    ],
    outputFiles: [
      {
        name: "output",
        fileBaseName: "units_summary.lindi.tar",
      },
    ],
    parameters: [
      {
        name: "correlogram_window_size_msec",
        value: adjustableParameterValues.correlogram_window_size_msec,
      },
      {
        name: "correlogram_bin_size_msec",
        value: adjustableParameterValues.correlogram_bin_size_msec,
      },
      {
        name: "units_path",
        value: removeLeadingSlash(path),
      },
    ],
  };
};

const getRequiredResources = (
  requireGpu: boolean,
): DendroJobRequiredResources => {
  return {
    numCpus: 2,
    numGpus: 0,
    memoryGb: 4,
    timeSec: 60 * 30,
  };
};

const gpuMode: "optional" | "required" | "forbidden" = "forbidden" as any;

const title = "Units Summary";

const UnitsSummaryItemView: FunctionComponent<Props> = ({
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

  const tags = useMemo(() => ["neurosift", "UnitsSummary"], []);

  return (
    <DendroItemView
      width={width}
      height={height}
      nwbUrl={nwbUrl}
      path={path}
      serviceName={serviceName}
      appName={undefined} // go by tags instead of app/processor
      processorName={processorName} // go by tags instead of app/processor
      tags={tags}
      title={title}
      adjustableParameters={adjustableParameters}
      defaultAdjustableParameters={defaultAdjustableParameters}
      getJobDefinition={getJobDefinition}
      getRequiredResources={getRequiredResources}
      gpuMode={gpuMode}
      OutputComponent={UnitsSummaryJobOutputWidget}
    />
  );
};

const UnitsSummaryJobOutputWidget: FunctionComponent<{
  job: DendroJob;
  width: number;
  nwbFile: RemoteH5FileX;
}> = ({ job, width }) => {
  const unitsSummaryOutputUrl = getJobOutputUrl(job, "output");
  const outputFile = useRemoteH5FileLindi(unitsSummaryOutputUrl);
  const dd = useAutocorrelogramsArray(outputFile);
  const unitIds = useUnitIds(outputFile);

  const data: AutocorrelogramsViewData | undefined = useMemo(() => {
    if (!dd) return undefined;
    if (!unitIds) return undefined;
    const autocorrelograms: AutocorrelogramData[] = [];
    for (let i = 0; i < unitIds.length; i++) {
      const unitId = unitIds[i];
      autocorrelograms.push({
        unitId,
        binEdgesSec: dd.binEdgesSec,
        binCounts: dd.array[i],
      });
    }
    return {
      type: "Autocorrelograms",
      autocorrelograms,
    };
  }, [dd, unitIds]);
  return (
    <div>
      <h3>Autocorrelograms</h3>
      {data && <AutocorrelogramsView data={data} width={width} height={800} />}
    </div>
  );
};

export const useRemoteH5FileLindi = (url: string | undefined) => {
  const [file, setFile] = useState<RemoteH5FileLindi | null>(null);
  useEffect(() => {
    if (!url) {
      setFile(null);
      return;
    }
    let canceled = false;
    (async () => {
      setFile(null);
      const f = await getRemoteH5FileLindi(url);
      if (canceled) return;
      setFile(f);
    })();
    return () => {
      canceled = true;
    };
  }, [url]);

  return file;
};

const useAutocorrelogramsArray = (h5: RemoteH5FileX | null) => {
  const [data, setData] = useState<{
    array: number[][];
    binEdgesSec: number[];
  } | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!h5) return;
      const ds = await h5.getDataset("autocorrelograms");
      if (!ds) return;
      if (canceled) return;
      const shape = ds.shape;
      const e = await h5.getDatasetData("autocorrelograms", {});
      const eReshaped = reshape2D(e, [shape[0], shape[1]]);
      if (canceled) return;
      setData({ array: eReshaped, binEdgesSec: ds.attrs.bin_edges_sec });
    })();
    return () => {
      canceled = true;
    };
  }, [h5]);

  return data;
};

const useUnitIds = (h5: RemoteH5FileX | null) => {
  const [data, setData] = useState<string[] | null>(null);
  useEffect(() => {
    let canceled = false;
    (async () => {
      if (!h5) return;
      const rootGroup = await h5.getGroup("/");
      if (!rootGroup) return;
      if (rootGroup.attrs["unit_ids"]) {
        // new method
        const unitIds = rootGroup.attrs["unit_ids"];
        if (canceled) return;
        setData(unitIds as any as string[]);
      } else {
        // old method (support first created output files)
        const dsData = await h5.getDatasetData("unit_ids", {});
        if (canceled) return;
        if (!dsData) return;
        setData(dsData as any as any[]);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [h5]);
  return data;
};

const reshape2D = (data: any, shape: [number, number]) => {
  const rows = shape[0];
  const cols = shape[1];
  const ret = [];
  for (let i = 0; i < rows; i++) {
    const row = [];
    for (let j = 0; j < cols; j++) {
      row.push(data[i * cols + j]);
    }
    ret.push(row);
  }
  return ret;
};

export default UnitsSummaryItemView;
